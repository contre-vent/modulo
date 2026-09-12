import 'dotenv/config';
import { educationServer } from '../src/education.js';
const port = Number(process.env.PORT || 3000);
const server = educationServer();
server.listen(port, '127.0.0.1', () => console.log(`Fiches éducatives : http://127.0.0.1:${port}/education/fr/sexualized_comment`));
