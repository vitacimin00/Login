const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PASSWORD = '@1April1998';
const ACCOUNTS_FILE = 'accounts.txt';
const PROXIES_FILE = 'proxies.txt';
const baseProfilePath = 'C:\\ChromeProfiles';
const PROCESSED_ACCOUNTS = new Set();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.70 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.149 Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:102.0) Gecko/20100101 Firefox/102.0',
  'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko'
];

function getRandomUserAgent() {
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Ambil proxy baris ke-i
const PROXIES = fs.existsSync(PROXIES_FILE)
  ? fs.readFileSync(PROXIES_FILE, 'utf8').split(/\r?\n/).filter(Boolean)
  : [];

async function processAccount(email, index) {
  const profilePath = path.join(baseProfilePath, `profile_${index + 1}`);
  const userAgent = getRandomUserAgent();

  // Ambil proxy sesuai indeks
  const proxyLine = PROXIES[index] || null;
  let proxyArg = null;
  let proxyAuth = null;

  if (proxyLine) {
    const noProto = proxyLine.replace(/^https?:\/\//, '');
    const [authPart, hostPart] = noProto.includes('@') ? noProto.split('@') : [null, noProto];
    proxyArg = hostPart;
    if (authPart) {
      const [username, password] = authPart.split(':');
      proxyAuth = { username, password };
    }
  }

  console.log(`\n🔐 Login akun ke-${index + 1}: ${email}`);
  console.log(`🧭 User-Agent: ${userAgent}`);
  if (proxyArg) console.log(`🌐 Proxy: ${proxyLine}`);
  else console.log(`🌐 Tidak menggunakan proxy`);

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: profilePath,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      ...(proxyArg ? [`--proxy-server=${proxyArg}`] : []),
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(userAgent);
    if (proxyAuth) await page.authenticate(proxyAuth);

    await page.goto('https://github.com/codespaces', { waitUntil: 'networkidle2' });

    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 20000 });

    const loginFieldExists = await page.$('#login_field');
    const passwordFieldExists = await page.$('#password');

    if (loginFieldExists && passwordFieldExists) {
      await page.type('#login_field', email, { delay: 50 });
      await page.type('#password', PASSWORD, { delay: 50 });
      await page.click('[name="commit"]');

      try {
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
        console.log(`✅ Login berhasil untuk ${email}`);
      } catch {
        console.log(`🔒 Verifikasi diperlukan (OTP): ${email}`);
      }
    } else {
      console.log(`✅ Sudah login (form tidak ditemukan): ${email}`);
    }

    await delay(7000);
  } catch (err) {
    console.log(`❌ Error akun ${email}:`, err.message);
  }
}

async function monitorAccounts() {
  setInterval(async () => {
    const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
    const allAccounts = data.split('\n').map(line => line.trim()).filter(line => line.includes('@'));

    for (let i = 0; i < allAccounts.length; i++) {
      const email = allAccounts[i];
      if (!PROCESSED_ACCOUNTS.has(email)) {
        PROCESSED_ACCOUNTS.add(email);
        await processAccount(email, i);
      }
    }
  }, 10000);
}

monitorAccounts().catch(console.error);
