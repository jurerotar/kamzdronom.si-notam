import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { configDotenv } from "dotenv";
// @ts-ignore
import cron from 'node-cron';
import {Notice} from "./types/notice";
import {scrapeNotices} from "./notam-scraper";

configDotenv();

const PORT = process.env.PORT ?? 5000;

// We don't really need persistent data, so we're pretending this is a database
const notices: Notice[] = [];

cron.schedule('* * * * *', async () => {
  const scrapedNotices = await scrapeNotices();
  scrapedNotices.forEach((scrapedNotice) => {
    if(!notices.some(({ id }) => id === scrapedNotice.id)) {
      notices.push(scrapedNotice);
    }
  });
});

const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.listen(PORT, async () => {
  app.get('/temporary-notices', async (_, res) => {
    const now = Date.now();
    const applicableRestrictions = notices.filter(({ applicableFrom, expiresAt }) => applicableFrom <= now && expiresAt > now);
    res.json(applicableRestrictions);
  });
});

export default app;
