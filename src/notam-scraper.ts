import {Notice} from "./types/notice";
import puppeteer from "puppeteer";
import dayjs from "dayjs";
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const DATE_FORMAT = 'DD.MM.YYYY HH:mm';

const formatWhitelist = [
  '.aspx',
  '.js'
];

export const scrapeNotices = async (): Promise<Notice[]> => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setRequestInterception(true);

  page.on('request', (interceptedRequest) => {
    const { pathname } = new URL(interceptedRequest.url());
    if(formatWhitelist.some((format) => pathname.endsWith(format))) {
      return interceptedRequest.continue();
    }
    return interceptedRequest.abort();
  });

  await page.goto('https://www.sloveniacontrol.si/Strani/Summary-A.aspx');

  const parsedNotices = await page.evaluate(() => {
    const notices = [...document.querySelectorAll('.kzps-notam-item')];
    return notices.flatMap((notice) => {
      const id = notice.querySelector('h1')?.textContent!;
      const parsedApplicableFrom = notice.querySelector('.kzps-notam-item-b')?.textContent?.substring(3, 19);
      const parsedExpiresAt = notice.querySelector('.kzps-notam-item-c')?.textContent?.substring(3, 19);
      const url = notice.querySelector('.kzps-notam-item-download a')?.getAttribute('href')!;

      if(parsedExpiresAt?.includes('PERM')) {
        return [];
      }

      return [
        {
          id,
          parsedApplicableFrom,
          parsedExpiresAt,
          url
        }
      ];
    });
  });

  await browser.close();

  return parsedNotices.map((notice) => ({
    id: notice.id,
    applicableFrom: dayjs(notice.parsedApplicableFrom, DATE_FORMAT).valueOf(),
    expiresAt: dayjs(notice.parsedExpiresAt, DATE_FORMAT).valueOf(),
    url: notice.url,
  })) satisfies Notice[];
}

