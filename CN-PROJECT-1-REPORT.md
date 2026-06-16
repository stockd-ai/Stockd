# Computer Networking — Project 1
## Build & Deploy a Public Website

**Course:** Computer Networking — Spring 2026
**Instructor:** Roya Hosseini

---

## Group Members & Roles

| Name | Role |
|------|------|
| Hardik Saini | Backend, Database, Deployment, DNS & Domain Configuration |
| Vihaan Dhaka | Frontend, UI/UX Design, Data Visualization |

---

## Project Links

- **Website:** [https://www.stockd.us](https://www.stockd.us)
- **GitHub:** [https://github.com/stockd-ai/Stockd](https://github.com/stockd-ai/Stockd)

**Stockd** is an AI-powered inventory management platform for restaurants, built with HTML, CSS, JavaScript, and a Supabase (PostgreSQL) backend. It is publicly hosted on **Vercel** with a custom domain purchased from **GoDaddy**.

---

## 1. Website (25 pts)

### ☐ Website Loads Publicly

The website is live and accessible to anyone at **https://www.stockd.us**. It returns an HTTP **200 OK** status code.

> **Screenshot — Browser showing the live website:**
>
> *(paste screenshot here)*

### ☐ Pages Render Correctly

The site includes the following pages, all rendering correctly:

| Page | URL Path | Description |
|------|----------|-------------|
| Landing Page | `/landing.html` | Project intro, features, call-to-action |
| Login | `/login.html` | Email/password authentication |
| Dashboard | `/pages/dashboard.html` | KPIs, charts, inventory alerts |
| Sales Analysis | `/pages/sales-analysis.html` | Revenue trends, peak hours |
| Onboarding | `/pages/onboarding.html` | First-time data upload |

> **Screenshot — A few pages rendering correctly:**
>
> *(paste screenshots here)*

### ☐ No Broken Links

All navigation links, page routes, and external CDN resources (Chart.js, PapaParse) load without errors.

> **Screenshot — DevTools Console showing no errors (optional):**
>
> *(paste screenshot here)*

---

## 2. Hosting & Domain (20 pts)

### ☐ Hosting Configured

We deployed the site on **Vercel** (free tier). Our GitHub repository is linked to Vercel so every push to `main` triggers an automatic deployment.

**Setup steps:**

1. Created the GitHub repository at `github.com/stockd-ai/Stockd`.
2. Built the frontend using HTML, CSS, and JavaScript in the `Frontend/` folder.
3. Connected the repo to Vercel and set the output directory to `Frontend/`.
4. Purchased the domain `stockd.us` from GoDaddy (registered Feb 10, 2026).
5. Changed the nameservers on GoDaddy to Vercel's DNS:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
6. Added `stockd.us` and `www.stockd.us` as custom domains in Vercel's dashboard.
7. Vercel automatically issued an SSL certificate via Let's Encrypt.

> **Screenshot — Vercel deployment dashboard:**
>
> *(paste screenshot here)*

> **Screenshot — GoDaddy nameserver settings (or Vercel domain settings):**
>
> *(paste screenshot here)*

### ☐ Domain/Subdomain Resolves Correctly

The domain `www.stockd.us` resolves to Vercel's servers. The bare domain `stockd.us` redirects to `www.stockd.us`.

```
$ nslookup www.stockd.us

Server:         131.96.6.237
Address:        131.96.6.237#53

Non-authoritative answer:
Name:   www.stockd.us
Address: 64.29.17.65
Name:   www.stockd.us
Address: 216.198.79.65
```

The domain resolves successfully to two IP addresses on Vercel's edge network.

---

## 3. Networking Evidence (35 pts)

### ☐ DNS Output (15 pts)

**DNS (Domain Name System)** translates our domain name `www.stockd.us` into an IP address so browsers know where to send requests.

#### nslookup

```
$ nslookup www.stockd.us

Server:         131.96.6.237
Address:        131.96.6.237#53

Non-authoritative answer:
Name:   www.stockd.us
Address: 64.29.17.65
Name:   www.stockd.us
Address: 216.198.79.65
```

- The DNS resolver (`131.96.6.237`) looked up our domain and returned two IP addresses.
- "Non-authoritative" means the answer came from a cache, not directly from the authoritative server.

#### dig

```
$ dig www.stockd.us +short

64.29.17.65
216.198.79.65
```

```
$ dig stockd.us ANY +noall +answer

stockd.us.    3591    IN    NS    ns2.vercel-dns.com.
stockd.us.    3591    IN    NS    ns1.vercel-dns.com.
```

- Our authoritative nameservers are `ns1.vercel-dns.com` and `ns2.vercel-dns.com` (Vercel DNS).
- Having two NS records provides redundancy — if one nameserver goes down, the other still works.

#### How DNS Resolution Works for Our Site

```
Browser → Local DNS Resolver → Root Server (.) → .us TLD Server → Vercel DNS (ns1.vercel-dns.com) → Returns IP: 64.29.17.65
```

> **Screenshot — Running nslookup or dig in terminal:**
>
> *(paste screenshot here)*

---

### ☐ IP Address Explanation (10 pts)

Our domain resolves to the following **IPv4** addresses:

| Domain | IP Address |
|--------|-----------|
| `www.stockd.us` | `64.29.17.65` |
| `www.stockd.us` | `216.198.79.65` |
| `stockd.us` | `64.29.17.1` |
| `stockd.us` | `216.198.79.65` |

- These are **public IPv4 addresses** belonging to Vercel's edge network.
- Having **multiple A records** means Vercel uses DNS-based load balancing — the client connects to the nearest or healthiest server.
- The connection happens on **port 443** (the standard port for HTTPS).

**Verification:**

```
$ curl -s https://www.stockd.us -o /dev/null -w "Remote IP: %{remote_ip}\nRemote Port: %{remote_port}\n"

Remote IP: 216.198.79.65
Remote Port: 443
```

This confirms the browser connects to `216.198.79.65` on port `443` over HTTPS.

> **Screenshot — IP address verification or browser DevTools showing remote address:**
>
> *(paste screenshot here)*

---

### ☐ HTTP/HTTPS Headers (10 pts)

#### HTTPS Response Headers

```
$ curl -sI https://www.stockd.us

HTTP/2 200
content-type: text/html; charset=utf-8
date: Mon, 02 Mar 2026 18:58:38 GMT
server: Vercel
strict-transport-security: max-age=63072000
x-vercel-cache: HIT
cache-control: public, max-age=0, must-revalidate
access-control-allow-origin: *
content-length: 1278
```

**Key headers explained:**

| Header | What It Means |
|--------|--------------|
| `HTTP/2 200` | The request succeeded (200 = OK) using HTTP/2 |
| `content-type: text/html` | The server is returning an HTML page |
| `server: Vercel` | Hosted on Vercel |
| `strict-transport-security` | HSTS — tells browsers to always use HTTPS |
| `x-vercel-cache: HIT` | The response was served from Vercel's CDN cache |
| `access-control-allow-origin: *` | Allows cross-origin requests (CORS) |

#### HTTP → HTTPS Redirect

When visiting with plain HTTP, the server redirects to HTTPS:

```
$ curl -sI http://www.stockd.us

HTTP/1.0 308 Permanent Redirect
Location: https://www.stockd.us/
server: Vercel
```

- **308 Permanent Redirect** — all HTTP requests are automatically sent to the HTTPS version.
- This means no unencrypted communication is possible.

#### Bare Domain Redirect

```
$ curl -sI https://stockd.us

HTTP/2 307
location: https://www.stockd.us/
server: Vercel
```

- Visiting `stockd.us` redirects to `www.stockd.us` so there is one canonical URL.

> **Screenshot — Browser DevTools Network tab showing headers:**
>
> *(paste screenshot here)*

> **Screenshot — Browser showing the lock icon (HTTPS) in the address bar:**
>
> *(paste screenshot here)*

---

## 4. Documentation (10 pts)

### ☐ Clear Steps

**How we built and deployed the site:**

1. Created a GitHub repo and built the frontend with HTML, CSS, and JavaScript.
2. Set up a Supabase project for the PostgreSQL database and authentication.
3. Connected the GitHub repo to Vercel for automatic deployments.
4. Bought the domain `stockd.us` on GoDaddy.
5. Pointed the nameservers to Vercel DNS (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`).
6. Added the domain in Vercel settings — HTTPS certificate was issued automatically.
7. Verified the site loads at `https://www.stockd.us`.

### ☐ Screenshots / Outputs Included

All command outputs in this report are real, run against `www.stockd.us`. Screenshot placeholders are included throughout for browser and DevTools evidence.

### ☐ Team Roles Explained

| Member | What They Did |
|--------|--------------|
| **Hardik Saini** | Set up the Supabase database (tables, RPCs, migrations), integrated Google Gemini AI, configured Vercel deployment, purchased and configured the domain/DNS |
| **Vihaan Dhaka** | Built the HTML/CSS/JS pages (landing, dashboard, login, sales analysis), designed the UI, implemented Chart.js data visualizations |

---

## 5. Security Implementation (10 pts)

### ☐ HTTPS / Security Feature Implemented

#### HTTPS with TLS 1.3

All traffic is served over HTTPS. The SSL certificate is issued by **Let's Encrypt** and auto-renewed by Vercel.

```
$ openssl s_client -connect www.stockd.us:443

subject = CN=*.stockd.us
issuer  = C=US, O=Let's Encrypt, CN=R12
Protocol: TLSv1.3
Cipher:   CHACHA20-POLY1305-SHA256
Verify:   OK
```

- **TLS 1.3** — the latest and most secure version of TLS.
- **Let's Encrypt** — free, trusted certificate authority.
- **Wildcard certificate** (`*.stockd.us`) — covers all subdomains.

#### HSTS (HTTP Strict Transport Security)

```
strict-transport-security: max-age=63072000
```

This header tells browsers to **only connect via HTTPS** for the next 2 years. Even if someone types `http://`, the browser upgrades to HTTPS automatically before making any request.

#### HTTP → HTTPS Enforcement

As shown above, any HTTP request gets a **308 Permanent Redirect** to HTTPS. No plaintext communication is allowed.

### ☐ Evidence Provided

| Security Feature | Evidence |
|-----------------|----------|
| HTTPS enforced | HTTP requests return 308 redirect to HTTPS |
| TLS 1.3 | `openssl` output shows TLSv1.3 with CHACHA20 cipher |
| HSTS header | `strict-transport-security: max-age=63072000` in response headers |
| Valid certificate | Let's Encrypt wildcard cert, verification passed |

> **Screenshot — Browser certificate viewer (click lock icon → certificate details):**
>
> *(paste screenshot here)*

---

## 6. Challenges & Solutions

| Challenge | How We Solved It |
|-----------|-----------------|
| DNS took time to propagate after changing nameservers | Waited ~24 hours and verified with `nslookup` from different networks |
| CORS errors when frontend talks to Supabase | Supabase handles CORS; Vercel sets `access-control-allow-origin: *` |
| Keeping API keys out of the GitHub repo | Used `.gitignore` to exclude config files; keys injected at build time |
| SSL certificate setup for custom domain | Vercel handles this automatically with Let's Encrypt — no manual setup needed |

---

## 7. Summary

> "Our website is hosted publicly, DNS resolves the domain to an IP address, and communication occurs over HTTPS using TCP/IP."

- **Website:** Live at [https://www.stockd.us](https://www.stockd.us), hosted on Vercel
- **DNS:** Domain resolves via Vercel DNS (`ns1.vercel-dns.com`) to IPs `64.29.17.65` and `216.198.79.65`
- **HTTPS:** All traffic encrypted with TLS 1.3, HTTP is redirected to HTTPS (308), HSTS enforced
- **Protocol Stack:** HTTP/2 over TLS 1.3, over TCP (port 443), over IPv4
