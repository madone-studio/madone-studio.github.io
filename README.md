# 🚀 MADONE Studio — We Build Games That Inspire

 <p align="center">
  <img src="https://github.com/hoatv2211/hoatv2211.github.io/blob/main/assets/videos/intro.gif?raw=true" width="600"/>
</p>

<p align="center">
  <b>Unity | WebGL | Blockchain | Mobile | GameFi | Outsource</b><br>
  <i>Game Development Studio based in Hanoi, Vietnam</i>
</p>

---

## 👋 About Us

**MADONE Studio** is a passionate, innovative game development team with over 7 years of experience in the gaming industry.  
We craft **mobile, WebGL, and blockchain games** — from casual fun to mid-core strategy and GameFi projects.  
Our mission? **Build games that inspire, connect, and bring joy to millions of players worldwide.**

- 🚀 **Unity 2D/3D Experts**  
- 💎 **Web3/GameFi/NFT Specialists**  
- 🏆 **Trusted by global clients & partners**  
- 🎮 **Full-stack production: Design → Develop → Deploy**

---

## 🛠️ What We Do

- **Custom Game Development:** Unity (2D, 3D, WebGL), cross-platform builds
- **Blockchain/GameFi Integration:** NFT, smart contracts, wallet connect, on-chain game logic
- **UI/UX, Animation, VFX:** Creative and engaging game assets
- **LiveOps & Backend:** Firebase, PlayFab, AWS, MongoDB, Docker
- **Consulting & Outsourcing:** Agile project management, scalable solutions

---

## 🌟 Featured Projects

| Project            | Platform          | Tech             | Description                                    | Link                      |
|--------------------|-------------------|------------------|------------------------------------------------|---------------------------|
| Nekoverse          | Android/iOS       | Unity, GameFi    | Turn-based RPG x Blockchain                    | [Play Store](https://play.google.com/store/apps/dev?id=8040121384216169189) |
| Gabros Games       | Android/iOS/WebGL | Unity            | Sandwich/DOP/DIY/Puzzle casual game series     | [Itch.io](https://o0-mad-0o.itch.io/) |
| Guardians of Kingdom | Android/iOS    | Unity, Node.js   | Idle RPG defense game                          | [Play Store](https://play.google.com/store/apps/dev?id=8040121384216169189) |
| Outsource Projects | Multi-platform    | Unity, Blockchain| Web3, Metaverse, P2E, NFT Game Development     | [Portfolio](https://github.com/hoatv2211) |

<sub>See more at our [Portfolio](https://github.com/hoatv2211) and [Itch.io](https://o0-mad-0o.itch.io/)</sub>

---

## 👨‍💻 Our Tech Stack

![Unity](https://img.shields.io/badge/Unity-100000?style=flat&logo=unity&logoColor=white)
![C#](https://img.shields.io/badge/C%23-239120?style=flat&logo=c-sharp&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat&logo=amazon-aws&logoColor=white)
![Blockchain](https://img.shields.io/badge/Blockchain-121212?style=flat&logo=bitcoin&logoColor=white)
![WebGL](https://img.shields.io/badge/WebGL-990000?style=flat&logo=webgl&logoColor=white)

---

## 🚀 Web Homepage & React Migration

The MADONE Studio static homepage is built with React and bundled with Vite.

### Development & Build Commands
- **Install dependencies:** `pnpm install --frozen-lockfile`
- **Build production bundle:** `node scripts/build.mjs` (or `pnpm run build`)
- **Run Playwright UI tests:** `node test-ui.mjs` (or `pnpm test`)
- **Run origin server verification:** `node test-server.mjs`
- **Run game demos validation:** `node test-games.mjs`
- **Smoke all seven Unity builds:** `node scripts/check-games.mjs` (set `MADONE_ORIGIN` to test the public deployment).
- **Verify Artwork UI and media:** `node --test test-artwork.mjs test-artwork-media.mjs` (uses existing host Playwright, Chromium and ffprobe).
- **Build a private preview:** `MADONE_BUILD_DIR=/absolute/staging/path node scripts/build.mjs`; never rebuild the live `dist` in place.

### Artwork
- Open `/#artwork` from the header or footer: 28 looping animations across three characters (10 / 17 / 1).
- Responsive preview cards, character filters, pause/play, reduced-motion default and native enlarged viewer with Previous/Next.
- Offline-baked WebM VP9 with H.264 MP4 fallback and JPEG posters; no Spine runtime or source rigs are published. Original files remain outside the repository.

### Production
- Project: `/data/madone-studio-profile`; static `dist` served at loopback IPv4 and IPv6 port `6789`.
- Service: `madone-studio-profile.service` (`deploy/madone-studio-profile.service`), enabled at boot and automatically restarted after a crash.
- Public: https://porfile-madonestudio.hollow-agent.xyz/ through the existing shared connector; no tunnel restart required.
- Start locally: `node server.mjs`. Only reviewed public artifacts are served, never repository sources.
- The contact form prepares a mailto draft; it does not send mail or require SMTP credentials. Four home cards had no demo in the original and are labelled unavailable.
- The original compiled Archero build logs an insecure-connection exception; TileCandy logs animation/advertising errors. Unity initialization is smoke-tested, not a complete gameplay/SDK test. Fixing compiled game internals requires their Unity sources.

---

## 🤝 Connect With Us

- 🌐 **Website:** [MADONE Studio](https://madone-studio.github.io/)
- 🕹️ **Portfolio:** [Itch.io](https://o0-mad-0o.itch.io/)
- 🏢 **LinkedIn:** [Tran Van Hoa](https://www.linkedin.com/in/hoatv/)
- 📧 **Email:** hoatv.mad@gmail.com
- 📱 **Telegram:** [@hoatv](https://t.me/Fish_Bros_bot)
- 📺 **YouTube:** [Gameplay Demos](https://www.youtube.com/watch?v=2jsMmlp8tuc)
- 🎮 **Google Play:** [Our Games](https://play.google.com/store/apps/dev?id=4917555335442358774)
- 💾 **GitHub:** [@hoatv2211](https://github.com/hoatv2211)

---

## ❤️ Why Work With MADONE Studio?

- We love games, and it shows in every pixel we make.
- Rapid, agile, transparent workflow.
- Top-tier tech, full-stack, and always up for new challenges.
- End-to-end support — from idea to global launch.

**Let’s build your next hit game together! 🚀**

---

<p align="center"><b>Made with ❤️ by MADONE Studio Team</b></p>
