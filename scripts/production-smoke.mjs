import { chromium } from "playwright";

const baseUrl = (
  process.env.PRODUCTION_SMOKE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://clientportal.ghostai.solutions"
).replace(/\/$/, "");
const timeout = 20_000;

const routes = [
  { path: "/", expected: [200, 307, 308] },
  { path: "/login", expected: [200] },
  { path: "/admin", expected: [200, 302, 307, 308, 401, 403] },
  { path: "/admin/organizations", expected: [200, 302, 307, 308, 401, 403] },
  { path: "/admin/proposals", expected: [200, 302, 307, 308, 401, 403] },
  { path: "/admin/projects", expected: [200, 302, 307, 308, 401, 403] },
  { path: "/admin/payments", expected: [200, 302, 307, 308, 401, 403] },
  { path: "/admin/audit", expected: [200, 302, 307, 308, 401, 403] },
  { path: "/p/not-a-real-token", expected: [200, 404] },
  { path: "/p/not-a-real-token/payment", expected: [200, 404] },
];

const browser = await chromium.launch();
const page = await browser.newPage();
const failures = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    failures.push(`Console error on ${page.url()}: ${message.text()}`);
  }
});

for (const route of routes) {
  const url = `${baseUrl}${route.path}`;
  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout,
  });
  const status = response?.status() ?? 0;

  if (!route.expected.includes(status)) {
    failures.push(
      `${route.path} returned ${status}; expected ${route.expected.join(", ")}`,
    );
  }

  const bodyText = await page
    .locator("body")
    .innerText({ timeout: 5_000 })
    .catch(() => "");
  if (/Application error: a server-side exception/i.test(bodyText)) {
    failures.push(`${route.path} rendered a server-side exception page.`);
  }
}

await browser.close();

if (failures.length) {
  console.error("Production smoke failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Production smoke passed for ${baseUrl}. No payment sessions were created.`,
);
