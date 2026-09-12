import { createServer } from 'node:http';
import type { Language, NegativeCategory } from './domain.js';

interface Lesson { title: string; why: string; instead: string }
export const lessons: Record<NegativeCategory, Record<Language, Lesson>> = {
  aggression: {
    fr: { title: 'Attaques personnelles', why: 'Une insulte déplace la discussion du problème vers la personne et peut humilier.', instead: 'Décris le fait observable, son impact et une demande précise. Exemple : « Il manque les chiffres de mars ; peux-tu les ajouter ? »' },
    en: { title: 'Personal attacks', why: 'An insult shifts the discussion from the problem to the person and can humiliate.', instead: 'Describe the observable fact, its impact and a specific request. Example: “The March figures are missing; could you add them?”' },
  },
  intimidation: {
    fr: { title: 'Intimidation', why: 'Une menace ou une pression coercitive peut empêcher une personne de s’exprimer librement.', instead: 'Explique tes attentes et les contraintes de travail sans menace ni représailles.' },
    en: { title: 'Intimidation', why: 'Threats or coercive pressure can prevent someone from speaking freely.', instead: 'Explain expectations and work constraints without threats or retaliation.' },
  },
  harassment: {
    fr: { title: 'Acharnement', why: 'Des attaques ou sollicitations hostiles répétées peuvent créer un climat intimidant. Un message isolé ne suffit pas toujours à établir ce contexte.', instead: 'Cesse les attaques, respecte les limites exprimées et formule une demande professionnelle claire.' },
    en: { title: 'Repeated hostility', why: 'Repeated hostile remarks or requests can create an intimidating environment. A single message may not establish this context.', instead: 'Stop personal attacks, respect stated boundaries and make a clear professional request.' },
  },
  discrimination: {
    fr: { title: 'Propos discriminatoires', why: 'Dévaloriser une identité ou un groupe exclut les personnes et détourne la discussion du travail.', instead: 'Parle des faits et des comportements pertinents, sans généralisation sur une identité.' },
    en: { title: 'Discriminatory remarks', why: 'Devaluing an identity or group excludes people and distracts from the work.', instead: 'Discuss relevant facts and behaviors without generalizations about an identity.' },
  },
  sexualized_comment: {
    fr: { title: 'Compliments sexualisés', why: 'Un compliment sur le corps ou une tenue présentée comme sexy peut sexualiser une relation professionnelle et mettre la personne mal à l’aise.', instead: 'Valorise une contribution, une idée ou un effort. Évite les commentaires sexualisés et les suggestions sur la tenue à porter.' },
    en: { title: 'Sexualized compliments', why: 'A compliment about someone’s body or a “sexy” outfit can sexualize a professional relationship and make the person uncomfortable.', instead: 'Recognize a contribution, idea or effort. Avoid sexualized comments and suggestions about what someone should wear.' },
  },
  condescension: {
    fr: { title: 'Condescendance', why: 'L’infantilisation ou un compliment dévalorisant présente l’autre comme inférieur.', instead: 'Adresse-toi à la personne comme à un pair. Donne un retour précis, sans jugement global sur ses capacités.' },
    en: { title: 'Condescension', why: 'Infantilizing language or a backhanded compliment frames someone as inferior.', instead: 'Address the person as a peer. Give specific feedback without sweeping judgments about their abilities.' },
  },
  targeted_sarcasm: {
    fr: { title: 'Sarcasme ciblé', why: 'Une plaisanterie qui ridiculise une personne peut humilier, même si elle est présentée comme de l’humour.', instead: 'Exprime directement le désaccord ou le besoin. Évite de faire d’un collègue la cible de la plaisanterie.' },
    en: { title: 'Targeted sarcasm', why: 'A joke that ridicules a person can humiliate, even when framed as humor.', instead: 'State the disagreement or need directly. Avoid making a colleague the target of a joke.' },
  },
  passive_aggression: {
    fr: { title: 'Formulation passive-agressive', why: 'Un reproche indirect peut rendre la demande difficile à comprendre et installer de la tension.', instead: 'Nomme le fait et ton besoin sans sous-entendu. Exemple : « J’attends ton retour pour avancer ; peux-tu répondre avant 15 h ? »' },
    en: { title: 'Passive-aggressive wording', why: 'An indirect reproach can obscure the request and create tension.', instead: 'State the fact and your need without insinuation. Example: “I need your feedback to proceed; could you reply before 3 p.m.?”' },
  },
};

export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Only generic educational content is served over HTTP; no reports or message data. */
export function educationServer() {
  return createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    const path = (req.url ?? '').split('?')[0] ?? '';
    if (path === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok'); return; }
    const match = /^\/education\/(fr|en)\/([a-z_]+)$/.exec(path);
    const language = match?.[1] as Language | undefined;
    const category = match?.[2];
    const lesson = category && language && Object.hasOwn(lessons, category)
      ? lessons[category as NegativeCategory][language] : undefined;
    if (!lesson) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end(`<!doctype html><html lang="${language}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(lesson.title)} · Modulo</title><style>body{font:18px/1.65 system-ui;max-width:44rem;margin:4rem auto;padding:0 1.5rem;color:#253245}h1{line-height:1.2}a{color:#135a9c}</style><main><p>Modulo · ${language === 'fr' ? 'Communication respectueuse' : 'Respectful communication'}</p><h1>${escapeHtml(lesson.title)}</h1><p>${escapeHtml(lesson.why)}</p><h2>${language === 'fr' ? 'Comment reformuler' : 'How to rephrase'}</h2><p>${escapeHtml(lesson.instead)}</p><p>${language === 'fr' ? 'Cette fiche explique une règle de communication ; elle ne constitue pas un jugement sur une personne.' : 'This page explains a communication guideline; it is not a judgment about a person.'}</p><a href="/education/${language === 'fr' ? 'en' : 'fr'}/${category}">${language === 'fr' ? 'English' : 'Français'}</a></main></html>`);
  });
}
