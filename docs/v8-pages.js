/* v8 — About, Privacy, Terms, Safety and Settings pages.
   One file renders all five, in Chinese or English, into <main>. The settings page also manages what this site
   keeps in the browser (notebook, plans, preferences), the Google Maps switch and the external-link warning. */
(() => {
  'use strict';
  const d = document, html = d.documentElement;
  const page = d.body.dataset.page;
  const PAGES = ['about', 'privacy', 'terms', 'safety', 'settings'];
  if (!PAGES.includes(page)) return;
  const zh = () => !/^en/i.test(html.lang || 'zh');
  const L = (z, e) => (zh() ? z : e);
  const q = () => '?lang=' + (zh() ? 'zh' : 'en');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ext = (href, label) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  const UPDATED = '2026-11-15';

  // Everything this site may keep in the browser, by group. Keys are the real ones the scripts use.
  const STORE = [
    { id: 'notebook', zh: '笔记本', en: 'Notebook', keys: ['pounamu-notebook-v1'], what: ['加入笔记本的线路和行程、你排的日期时间、笔记和贴的照片', 'Routes and trips you added, the dates and times you set, your notes and photos'] },
    { id: 'plan', zh: '排行程', en: 'Trip planner', keys: ['p10-road-plan', 'p10-road-plan-order'], what: ['上次排行程用的城市、天数、节奏、勾选的地点和日程顺序', 'The cities, days, pace, picked places and day order from your last plan'] },
    { id: 'draft', zh: '行程编辑草稿', en: 'Trip editor draft', keys: ['pounamu-v4-draft'], what: ['行程编辑器里正在改的逐日草稿', 'The day-by-day draft open in the trip editor'] },
    { id: 'prefs', zh: '显示偏好', en: 'Display preferences', keys: ['nz-slowly-motion', 'v7-routes-view', 'pounamu-maps', 'pounamu-ext-warn'], what: ['动效开关、线路卡的翻页或平铺、Google 地图开关、外部链接提醒', 'Motion on or off, card deck or grid, the Google Maps switch, the external-link warning'] }
  ];
  const SESSION_KEYS = ['pounamu-plan-handoff', 'v7-deck-id', 'ui2-contour-d', 'ui2-contour-l', 'pounamu-maps'];
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const bytes = keys => keys.reduce((n, k) => { const v = get(k); return n + (v ? (k.length + v.length) * 2 : 0); }, 0);
  const kb = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;

  /* ------------------------------------------------------------------ content */
  const CONTENT = {
    about: () => ({
      label: L('关于我们', 'ABOUT US'),
      title: L('一本给新西兰旅行者的线路地图册', 'A route atlas for travelling New Zealand'),
      lede: L('绿石之地（Pounamu Atlas）把新西兰南北两岛的徒步、骑行、自驾和公共交通线路整理成中英双语的线路卡、逐日行程和真实地图，让第一次去新西兰的人也能把行程排清楚。',
        'Pounamu Atlas turns walking, cycling, driving and public-transport routes across both islands of New Zealand into bilingual route cards, day-by-day plans and real maps, so a first trip can be planned with confidence.'),
      sections: [
        { id: 'name', h: L('名字的来历', 'The name'), body: L(
          `<p><strong>Pounamu</strong> 是毛利语，指新西兰出产的绿玉（软玉、鲍文玉等）。在毛利文化里，pounamu 是珍贵的 taonga（珍宝），常被雕成随身佩戴、代代相传的饰物。南岛的毛利名 <em>Te Waipounamu</em>，意思是「绿玉之水」。</p><p>我们的标志是一块打磨过的绿石：上方的小孔是吊坠的穿绳处，石面上刻着南阿尔卑斯山和湖水。中文名「绿石之地」和英文名 Pounamu Atlas 指的都是这片土地，以及这本把它画成地图的册子。</p>`,
          `<p><strong>Pounamu</strong> is the Māori word for New Zealand greenstone (nephrite jade, bowenite and related stones). In Māori culture pounamu is a treasured taonga, often carved into pieces worn close and handed down. The South Island's Māori name, <em>Te Waipounamu</em>, means "the waters of greenstone".</p><p>Our mark is a polished greenstone: the small hole at the top is where a pendant's cord would go, and the Southern Alps and a lake are carved into its face. 绿石之地 ("land of the green stone") and Pounamu Atlas both name this land and the atlas that maps it.</p>`) },
        { id: 'what', h: L('这里有什么', 'What you will find'), body: L(
          `<ul class="v8-list"><li><strong>79 条线路</strong>：徒步、骑行、自驾、公共交通和划船，每条都有起终点、用时、难度、季节和 Google 地图。</li><li><strong>10 个行程模板</strong>：从 3 天到两周，可以直接放进行程编辑器改。</li><li><strong>排行程</strong>：选天数、岛屿和交通方式，生成逐日路线，标出每晚住哪、每天开多久。</li><li><strong>笔记本</strong>：把喜欢的线路和行程收进来，排日期时间、写笔记、贴照片。</li><li><strong>出发准备</strong>：签证、驾驶、天气、步道开放和安全事项。</li></ul>`,
          `<ul class="v8-list"><li><strong>79 routes</strong> for walking, cycling, driving, public transport and paddling, each with start and finish, time, grade, season and a Google map.</li><li><strong>10 trip templates</strong>, from 3 days to two weeks, ready to edit in the trip editor.</li><li><strong>Trip planner</strong>: choose days, island and transport for a day-by-day route with nightly stops and drive times.</li><li><strong>Notebook</strong>: keep routes and trips you like, set dates and times, add notes and photos.</li><li><strong>Before you go</strong>: visas, driving, weather, track status and safety.</li></ul>`) },
        { id: 'how', h: L('我们怎么整理资料', 'How we work'), body: L(
          `<p>线路事实来自公开、可核对的官方资料，主要是新西兰保护部（DOC）、新西兰交通局（NZTA Waka Kotahi）、新西兰土地信息局（LINZ）、MetService 和各地区议会，地图数据来自 Natural Earth、LINZ 和 OpenStreetMap，照片来自 Wikimedia Commons 并按原许可署名。</p><p>我们用自己的话改写，并翻成中文；每条线路查过哪些来源、还有哪些需要再核实，都集中列在 <a href="sources.html${q()}">资料来源</a> 页，正文里不再夹杂来源标注。</p><p>步道关闭、路况和天气变化很快。出发前请一定再看一次官方的最新公告。</p>`,
          `<p>Route facts come from public, checkable official sources, mainly the Department of Conservation (DOC), NZTA Waka Kotahi, Land Information New Zealand (LINZ), MetService and regional councils. Map data comes from Natural Earth, LINZ and OpenStreetMap; photographs come from Wikimedia Commons and are credited under their own licences.</p><p>We rewrite in our own words and translate into Chinese. What we checked for each route, and what still needs checking, is listed on the <a href="sources.html${q()}">Sources</a> page instead of in the reading text.</p><p>Track closures, roads and weather change quickly. Always check the latest official notices before you set out.</p>`) },
        { id: 'not', h: L('我们不做的事', 'What we do not do'), body: L(
          `<ul class="v8-list"><li>不需要注册账号，也没有登录。</li><li>不卖团、不代订住宿和门票，页面上没有付款。</li><li>不放广告，不装访问统计。</li><li>不是政府网站，也不代表 DOC、NZTA 或任何官方机构。</li></ul>`,
          `<ul class="v8-list"><li>No account and no sign-in.</li><li>No tours, no bookings for stays or tickets, and no payments on the site.</li><li>No advertising and no visitor analytics.</li><li>Not a government site, and not speaking for DOC, NZTA or any agency.</li></ul>`) }
      ]
    }),

    privacy: () => ({
      label: L('隐私政策', 'PRIVACY POLICY'),
      title: L('你的行程留在你的浏览器里', 'Your plans stay in your browser'),
      lede: L('绿石之地没有账号、没有表单提交，也不装访问统计。你在这里排的行程、写的笔记和贴的照片，只保存在你自己的浏览器里。下面写清楚本站会在你的设备上保存什么、什么时候会连接第三方，以及你可以怎么管理。',
        'Pounamu Atlas has no accounts, no form submissions and no visitor analytics. The plans, notes and photos you make here are kept only in your own browser. This page explains what the site keeps on your device, when your browser contacts third parties, and how you control it.'),
      sections: [
        { id: 'collect', h: L('我们收集什么', 'What we collect'), body: L(
          `<p>本站是放在 GitHub Pages 上的静态网站，没有自己的服务器和数据库。我们<strong>不收集</strong>你的姓名、邮箱、电话或位置，也不设置用于追踪的 Cookie。</p>`,
          `<p>This is a static site on GitHub Pages with no server or database of our own. We do <strong>not</strong> collect your name, email, phone number or location, and we set no tracking cookies.</p>`) },
        { id: 'local', h: L('保存在你浏览器里的数据', 'What stays in your browser'), body: L(
          `<p>为了让你下次打开还能接着排，本站用浏览器的本地存储（localStorage）保存下面这些内容。它们不会上传到任何地方，换一台设备或换一个浏览器就看不到：</p>${storeTable()}<p>另有几项只在当前标签页里临时保存（sessionStorage），关掉标签页就会清空，比如从首页带到排行程页的选择、线路卡翻到第几张。</p><p>你可以随时在 <a href="settings.html${q()}#privacy">隐私设置</a> 里查看大小、导出笔记本，或清除全部数据。</p>`,
          `<p>So you can pick up where you left off, the site keeps the following in your browser's local storage. None of it is uploaded anywhere, and it does not follow you to another device or browser:</p>${storeTable()}<p>A few items live only in the current tab (sessionStorage) and are cleared when you close it, such as the choice carried from the home page to the planner and the card you were on in the route deck.</p><p>You can check their size, export your notebook or clear everything at any time in <a href="settings.html${q()}#privacy">Privacy settings</a>.</p>`) },
        { id: 'share', h: L('分享链接', 'Share links'), body: L(
          `<p>排行程页的「复制分享链接」会把你选的城市、天数和地点写进网址。只有你把链接发给别人，他们才看得到这些内容；链接里不含笔记和照片。</p>`,
          `<p>"Copy share link" on the planner writes your cities, days and places into the address. Only people you send the link to can see them; notes and photos are never included.</p>`) },
        { id: 'third', h: L('第三方服务', 'Third parties'), body: L(
          `<ul class="v8-list"><li><strong>GitHub Pages（托管）</strong>：你打开本站时，GitHub 会像所有网站服务器一样收到你的 IP 地址等访问信息，用于安全和运行。见 ${ext('https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement', 'GitHub 隐私声明')}。</li><li><strong>Google 地图（嵌入）</strong>：线路页、行程编辑和笔记本里的地图由 Google 提供。地图加载时，你的浏览器会连接 Google，Google 会收到你的 IP 地址并可能按它的政策设置 Cookie。见 ${ext('https://policies.google.com/privacy', 'Google 隐私政策')}。不想连接 Google，可以在 <a href="settings.html${q()}#privacy">隐私设置</a> 里关掉地图，页面会改为显示「加载地图」按钮。</li><li><strong>外部链接</strong>：点开 DOC、NZTA、MetService 或「在 Google Maps 打开」等链接后，就适用对方网站的隐私政策。</li></ul><p>本站的字体、图片和数据文件都放在本站，不从其他网站加载。</p>`,
          `<ul class="v8-list"><li><strong>GitHub Pages (hosting)</strong>: when you open the site, GitHub receives your IP address and similar request details, as any web server does, for security and operations. See the ${ext('https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement', 'GitHub Privacy Statement')}.</li><li><strong>Google Maps (embedded)</strong>: maps on route pages, the trip editor and the notebook come from Google. When a map loads, your browser contacts Google, which receives your IP address and may set cookies under its own policy. See the ${ext('https://policies.google.com/privacy', 'Google Privacy Policy')}. To avoid contacting Google, turn maps off in <a href="settings.html${q()}#privacy">Privacy settings</a>; pages then show a "Load map" button instead.</li><li><strong>External links</strong>: once you follow a link to DOC, NZTA, MetService or "Open in Google Maps", that site's privacy policy applies.</li></ul><p>The site's fonts, images and data files are served from this site, not loaded from other websites.</p>`) },
        { id: 'rights', h: L('查看、导出和删除', 'See, export and delete'), body: L(
          `<p>因为数据只在你的浏览器里，你本人就能完全控制：在 <a href="settings.html${q()}#privacy">隐私设置</a> 里可以逐项清除、导出笔记本，或一键清除本站在此浏览器的全部数据；也可以用浏览器自带的「清除网站数据」。我们手里没有你的数据副本，所以也无法替你找回已清除的内容。</p>`,
          `<p>Because the data is only in your browser, you are fully in control: in <a href="settings.html${q()}#privacy">Privacy settings</a> you can clear items one by one, export your notebook, or clear everything this site keeps in this browser; your browser's own "clear site data" works too. We hold no copy, so we cannot restore anything you clear.</p>`) },
        { id: 'children', h: L('未成年人', 'Children'), body: L(
          `<p>本站面向成年旅行者，不会有意收集任何人的个人信息，包括未成年人。</p>`,
          `<p>The site is meant for adult travellers and does not knowingly collect personal information from anyone, including children.</p>`) },
        { id: 'changes', h: L('政策变更', 'Changes'), body: L(
          `<p>如果以后加入需要把数据发给第三方的功能，我们会先在页面上说明并征得你的同意，再更新本政策。本政策最后更新于 ${UPDATED}。</p>`,
          `<p>If we add a feature that sends data to a third party, we will explain it on the page and ask for your consent first, then update this policy. Last updated ${UPDATED}.</p>`) }
      ]
    }),

    terms: () => ({
      label: L('使用条款', 'TERMS OF USE'),
      title: L('使用本站前请读一读', 'Please read before you use the site'),
      lede: L('绿石之地提供的是行前参考信息，不是官方公告，也不替你做安全判断。使用本站即表示你同意下面的条款。',
        'Pounamu Atlas offers trip-planning information, not official notices, and it cannot make safety decisions for you. By using the site you agree to these terms.'),
      sections: [
        { id: 'service', h: L('网站提供的内容', 'What the site provides'), body: L(
          `<p>本站提供新西兰线路介绍、行程模板、排行程工具、笔记本和出发准备信息，全部免费，不需要账号。本站不提供预订、导游或交通服务，也不代收任何费用。</p>`,
          `<p>The site provides New Zealand route guides, trip templates, a trip planner, a notebook and travel preparation notes, free and without an account. It does not sell bookings, guiding or transport, and takes no payments.</p>`) },
        { id: 'accuracy', h: L('资料来源与准确性', 'Sources and accuracy'), body: L(
          `<p>我们尽量依据官方公开资料整理，并在 <a href="sources.html${q()}">资料来源</a> 页列出依据和待核实事项。但步道开放、路况、天气、渡轮和公交时刻随时会变，地图上的连线也只是示意。<strong>出发前请以 DOC、NZTA、MetService 等官方的最新发布为准。</strong></p>`,
          `<p>We work from official public sources and list them, with items still to verify, on the <a href="sources.html${q()}">Sources</a> page. Track status, roads, weather, ferries and timetables change at any time, and lines on our maps are schematic. <strong>Before you go, rely on the latest from DOC, NZTA, MetService and other official sources.</strong></p>`) },
        { id: 'you', h: L('你的责任', 'Your responsibilities'), body: L(
          `<ul class="v8-list"><li>徒步、骑行、划船和山地自驾都有风险。请按自己的经验、体能和装备选择线路，并自行判断天气和路况。</li><li>遵守 DOC 和地方政府的规定、关闭通知和许可要求，尊重私人土地和毛利文化圣地。</li><li>开车请遵守新西兰道路规则，靠左行驶，按标示限速。</li></ul>`,
          `<ul class="v8-list"><li>Walking, cycling, paddling and mountain driving carry risk. Choose routes that suit your experience, fitness and gear, and judge the weather and conditions yourself.</li><li>Follow DOC and council rules, closures and permit requirements, and respect private land and sites of significance to Māori.</li><li>When driving, follow the New Zealand road code: keep left and keep to posted limits.</li></ul>`) },
        { id: 'licence', h: L('内容与图片权利', 'Content and image rights'), body: L(
          `<ul class="v8-list"><li>本站自己写的文字、线路数据和自绘图按 ${ext('https://creativecommons.org/licenses/by/4.0/deed.zh-hans', 'CC BY 4.0')} 发布，转载请署名「绿石之地 / Pounamu Atlas」。</li><li>网站代码按 MIT 许可发布。</li><li>DOC、LINZ、OpenStreetMap、Natural Earth 的数据和 Wikimedia Commons 的照片，按各自原来的许可使用，逐项列在 <a href="sources.html${q()}#licence">资料来源 · 许可</a>。</li><li>标志中的毛笔字取自马善政字体（Ma Shan Zheng，SIL 开源字体许可 1.1）。</li><li>首页开场图和纸张纹理由 AI 生成，页面上已标明。</li></ul>`,
          `<ul class="v8-list"><li>Our own writing, route data and drawings are published under ${ext('https://creativecommons.org/licenses/by/4.0/', 'CC BY 4.0')}; please credit "Pounamu Atlas / 绿石之地".</li><li>The site's code is under the MIT licence.</li><li>Data from DOC, LINZ, OpenStreetMap and Natural Earth, and photographs from Wikimedia Commons, are used under their original licences, listed under <a href="sources.html${q()}#licence">Sources · Licences</a>.</li><li>The brush lettering in our logo is drawn from the Ma Shan Zheng typeface (SIL Open Font License 1.1).</li><li>The opening image and paper texture are AI-generated and labelled as such.</li></ul>`) },
        { id: 'links', h: L('第三方链接与责任范围', 'Third-party links and liability'), body: L(
          `<p>本站链接和嵌入的第三方网站（如 Google 地图、DOC、NZTA）由对方负责，其内容和可用性不在我们控制之内。在法律允许的范围内，绿石之地不对因使用本站信息造成的损失负责。</p>`,
          `<p>Third-party sites we link to or embed, such as Google Maps, DOC and NZTA, are their owners' responsibility; we do not control their content or availability. To the extent the law allows, Pounamu Atlas is not liable for loss arising from use of the information on this site.</p>`) },
        { id: 'changes', h: L('条款变更', 'Changes'), body: L(
          `<p>条款可能随网站功能调整而更新，更新后在本页公布。最后更新于 ${UPDATED}。</p>`,
          `<p>These terms may change as the site changes; updates are posted on this page. Last updated ${UPDATED}.</p>`) }
      ]
    }),

    safety: () => ({
      label: L('安全须知', 'SAFETY'),
      title: L('新西兰的户外很美，也很认真', 'New Zealand outdoors: beautiful, and serious'),
      lede: L('天气变化快、山区信号弱、溪流会突然涨水。下面是出发前最该知道的几件事。紧急情况请直接拨打 111。',
        'Weather turns fast, mountains have little signal and rivers rise suddenly. Here is what matters most before you go. In an emergency, call 111.'),
      sections: [
        { id: 'emergency', h: L('紧急情况', 'Emergencies'), body: L(
          `<div class="v8-callout"><strong>111</strong><span>警察、消防、救护车都拨 111。在山野或海上需要搜救时，拨 111 后说要找警察（Police）。没有信号时，个人定位信标（PLB）可以发出求救。</span></div><ul class="v8-list"><li>进入偏远地区，建议租一个 PLB，许多 DOC 游客中心和户外店都能租到。</li><li>出发前把路线和预计返回时间告诉可靠的人，也可以在 ${ext('https://www.adventuresmart.nz/', 'AdventureSmart')} 填写户外出行计划。</li></ul>`,
          `<div class="v8-callout"><strong>111</strong><span>Call 111 for police, fire or ambulance. For search and rescue on land or at sea, call 111 and ask for Police. Without signal, a personal locator beacon (PLB) can call for help.</span></div><ul class="v8-list"><li>Heading somewhere remote? Hire a PLB; many DOC visitor centres and outdoor shops have them.</li><li>Tell someone reliable your route and when you expect to be back, or leave an outdoors intentions plan with ${ext('https://www.adventuresmart.nz/', 'AdventureSmart')}.</li></ul>`) },
        { id: 'code', h: L('户外安全守则', 'The Land Safety Code'), body: L(
          `<p>新西兰山地安全委员会（Mountain Safety Council）的五条守则：</p><ol class="v8-steps"><li><strong>选择适合你的线路</strong>：按经验和体能来，查好用时和难度。</li><li><strong>了解天气</strong>：出发前看 ${ext('https://www.metservice.com/mountains-and-parks', 'MetService 山区预报')}，天气变坏就改计划。</li><li><strong>带够保暖衣物和额外食物</strong>：夏天的山上也可能降到接近零度。</li><li><strong>告诉别人你的计划，带上求救工具</strong>。</li><li><strong>照顾好自己和同伴</strong>：一起出发，一起回来。</li></ol>`,
          `<p>The five points of the Mountain Safety Council's Land Safety Code:</p><ol class="v8-steps"><li><strong>Choose the right trip for you</strong>: match your experience and fitness; check the time and grade.</li><li><strong>Understand the weather</strong>: read the ${ext('https://www.metservice.com/mountains-and-parks', 'MetService mountain forecast')} and change plans if it turns.</li><li><strong>Pack warm clothes and extra food</strong>: even in summer the mountains can drop near freezing.</li><li><strong>Share your plans and take ways to get help</strong>.</li><li><strong>Take care of yourself and each other</strong>: leave together, come back together.</li></ol>`) },
        { id: 'tracks', h: L('步道与水域', 'Tracks and water'), body: L(
          `<ul class="v8-list"><li>出发前在 ${ext('https://www.doc.govt.nz/parks-and-recreation/', 'DOC 官网')} 查看步道开放情况和警示，关闭的步道不要进入。</li><li>溪流涨水时不要涉水，宁可等待或折返。</li><li>海边注意离岸流，尽量在有救生员的海滩游泳，在旗帜之间下水。</li><li>新西兰紫外线很强，阴天也要防晒。</li></ul>`,
          `<ul class="v8-list"><li>Check track status and alerts on the ${ext('https://www.doc.govt.nz/parks-and-recreation/', 'DOC website')} before you go, and never enter a closed track.</li><li>Do not cross rivers in flood; wait it out or turn back.</li><li>At the beach, watch for rips; swim at patrolled beaches, between the flags.</li><li>New Zealand's UV is strong; use sun protection even when it is cloudy.</li></ul>`) },
        { id: 'roads', h: L('自驾', 'Driving'), body: L(
          `<ul class="v8-list"><li>新西兰<strong>靠左行驶</strong>，按标示限速；山路弯多，实际用时常比导航长。</li><li>单车道桥按指示牌让行；冬季过山口可能要求带防滑链。</li><li>长途驾驶每两小时休息一次，疲劳不要上路。</li><li>出发前在 ${ext('https://www.journeys.nzta.govt.nz/', 'NZTA 路况')} 查看封路和施工。</li></ul>`,
          `<ul class="v8-list"><li>New Zealand <strong>drives on the left</strong>; keep to posted limits. Mountain roads are winding and often take longer than navigation suggests.</li><li>Give way at one-lane bridges as signed; alpine passes may require chains in winter.</li><li>On long drives, take a break every two hours and never drive tired.</li><li>Check closures and roadworks on ${ext('https://www.journeys.nzta.govt.nz/', 'NZTA Journey Planner')} before you set out.</li></ul>`) },
        { id: 'nature', h: L('地震、火山与海啸', 'Earthquakes, volcanoes and tsunami'), body: L(
          `<ul class="v8-list"><li>地震时：趴下、掩护、抓牢（Drop, Cover, Hold）。</li><li>在海边感到地震<strong>时间长或强烈</strong>，不要等警报，立即往高处或内陆走（Long or Strong, Get Gone）。</li><li>火山区域按 DOC 和地方民防的警示行动。</li></ul>`,
          `<ul class="v8-list"><li>In an earthquake: Drop, Cover and Hold.</li><li>Near the coast, if a quake is <strong>long or strong, get gone</strong>: head to high ground or inland without waiting for a warning.</li><li>In volcanic areas, follow DOC and civil defence alerts.</li></ul>`) },
        { id: 'border', h: L('入境与生物安全', 'Border and biosecurity'), body: L(
          `<p>新西兰对食品、植物、动物制品和沾泥的户外装备查得很严。入境卡上如实申报，徒步鞋和帐篷清理干净再带入。</p>`,
          `<p>New Zealand is strict about food, plants, animal products and muddy outdoor gear. Declare honestly on your arrival card and clean boots and tents before you bring them in.</p>`) }
      ]
    }),

    settings: () => ({
      label: L('隐私与安全设置', 'PRIVACY & SECURITY SETTINGS'),
      title: L('管理本站在这台设备上的一切', 'Control what this site does on this device'),
      lede: L('这些设置只对当前浏览器生效，保存在你的设备上。改动立即生效，不需要保存按钮。',
        'These settings apply to this browser only and are kept on your device. Changes take effect at once; there is nothing to save.'),
      sections: [
        { id: 'privacy', h: L('隐私设置', 'Privacy settings'), body: settingsPrivacy },
        { id: 'display', h: L('显示与动效', 'Display and motion'), body: settingsDisplay },
        { id: 'security', h: L('安全设置', 'Security settings'), body: settingsSecurity }
      ]
    })
  };

  function storeTable() {
    return `<table class="v8-table"><thead><tr><th>${L('内容', 'What')}</th><th>${L('保存了什么', 'What is kept')}</th></tr></thead><tbody>${STORE.map(s => `<tr><td><strong>${esc(zh() ? s.zh : s.en)}</strong></td><td>${esc(zh() ? s.what[0] : s.what[1])}</td></tr>`).join('')}</tbody></table>`;
  }

  const sw = (id, on, label, hint) => `<div class="v8-setting"><div><strong id="${id}-l">${label}</strong><p>${hint}</p></div><button type="button" class="v8-switch" role="switch" aria-checked="${on}" aria-labelledby="${id}-l" data-set="${id}"><span></span></button></div>`;

  function settingsPrivacy() {
    const mapsOn = get('pounamu-maps') !== 'off';
    const rows = STORE.map(s => {
      const size = bytes(s.keys);
      let extra = '';
      if (s.id === 'notebook') {
        try { const nb = JSON.parse(get('pounamu-notebook-v1') || 'null'); if (nb) extra = L(`${(nb.items || []).length} 张卡 · ${(nb.notes || []).length} 条笔记`, `${(nb.items || []).length} cards · ${(nb.notes || []).length} notes`); } catch (e) { extra = ''; }
      }
      return `<tr><td><strong>${esc(zh() ? s.zh : s.en)}</strong><small>${esc(zh() ? s.what[0] : s.what[1])}</small></td><td class="v8-num">${size ? kb(size) : L('无', 'none')}${extra ? `<small>${extra}</small>` : ''}</td><td class="v8-act">${s.id === 'notebook' && size ? `<button type="button" class="v8-btn" data-export="notebook">${L('导出', 'Export')}</button>` : ''}<button type="button" class="v8-btn" data-clear="${s.id}" ${size ? '' : 'disabled'}>${L('清除', 'Clear')}</button></td></tr>`;
    }).join('');
    return `${sw('maps', mapsOn, L('加载 Google 地图', 'Load Google Maps'), L('开启时，线路页、行程编辑和笔记本会直接嵌入 Google 地图，你的浏览器会连接 Google。关闭后不再自动连接，地图位置改为显示「加载地图」按钮，由你决定是否加载。', 'When on, route pages, the trip editor and the notebook embed Google Maps, and your browser contacts Google. When off, nothing connects automatically; each map shows a "Load map" button instead.'))}
      <h3 class="v8-h3">${L('保存在这台设备上的数据', 'Data kept on this device')}</h3>
      <table class="v8-table v8-store"><thead><tr><th>${L('内容', 'What')}</th><th>${L('大小', 'Size')}</th><th><span class="v8-sr">${L('操作', 'Actions')}</span></th></tr></thead><tbody>${rows}</tbody></table>
      <div class="v8-danger"><div><strong>${L('清除本站在此浏览器的全部数据', 'Clear everything this site keeps in this browser')}</strong><p>${L('笔记本、行程、草稿和偏好都会删除，无法恢复。需要的话先导出笔记本。', 'Notebook, plans, drafts and preferences are deleted and cannot be restored. Export your notebook first if you need it.')}</p></div><button type="button" class="v8-btn v8-btn-danger" data-clear="all">${L('全部清除', 'Clear all')}</button></div>
      <p class="v8-status" role="status" aria-live="polite"></p>`;
  }
  function settingsDisplay() {
    const motionOn = (get('nz-slowly-motion') || 'on') !== 'off';
    const deck = get('v7-routes-view') !== 'grid';
    return `${sw('motion', motionOn, L('页面动效', 'Page motion'), L('图片推拉、景深和滚动动画。关闭后页面保持静止，更省电，也适合对动效敏感的人。', 'Image push-pull, depth of field and scroll animation. Turn off for a still page that uses less power and suits people sensitive to motion.'))}
      ${sw('deck', deck, L('线路卡翻页', 'Route card deck'), L('「挑线路」用翻页卡组展示；关闭后改为平铺网格。', 'Show routes as a flip deck; turn off for a plain grid.'))}
      <div class="v8-setting"><div><strong>${L('语言', 'Language')}</strong><p>${L('当前：中文。切换后所有页面跟着改。', 'Current: English. Every page follows the switch.')}</p></div><button type="button" class="v8-btn" data-lang-switch>${L('Switch to English', '切换到中文')}</button></div>`;
  }
  function settingsSecurity() {
    const secure = location.protocol === 'https:';
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const warn = get('pounamu-ext-warn') === 'on';
    return `<div class="v8-check ${secure ? 'ok' : local ? 'info' : 'bad'}"><span aria-hidden="true">${secure ? '✓' : local ? 'i' : '!'}</span><div><strong>${secure ? L('已使用加密连接（HTTPS）', 'Encrypted connection (HTTPS)') : local ? L('本地预览', 'Local preview') : L('当前不是加密连接', 'Not an encrypted connection')}</strong><p>${secure ? L('你和本站之间传输的内容经过加密，地址栏的网址应为 dengletian702-rgb.github.io/pounamu-atlas。', 'Traffic between you and the site is encrypted. The address should read dengletian702-rgb.github.io/pounamu-atlas.') : local ? L('你正在本机预览，线上版本使用 HTTPS。', 'You are previewing locally; the live site uses HTTPS.') : L('请改用 https:// 开头的地址访问。', 'Please use the https:// address.')}</p></div></div>
      ${sw('extwarn', warn, L('离开本站前提醒我', 'Warn me before leaving the site'), L('点开外部网站（如 DOC、NZTA、Google 地图）前先弹出提示，告诉你要去哪个网址，确认后再打开。', 'Before opening an outside site (such as DOC, NZTA or Google Maps), show the address you are going to and ask first.'))}
      <h3 class="v8-h3">${L('本站永远不会向你索要', 'This site will never ask you for')}</h3>
      <ul class="v8-never"><li>${L('密码或验证码', 'Passwords or one-time codes')}</li><li>${L('银行卡、支付或转账', 'Card details, payments or transfers')}</li><li>${L('护照、身份证等证件号码', 'Passport or ID numbers')}</li><li>${L('手机号、邮箱或住址', 'Phone, email or home address')}</li></ul>
      <p>${L('本站没有账号、没有付款、没有表单提交。如果看到以「绿石之地」名义索要上面这些信息的网页、邮件或消息，那不是我们，请不要提供。', 'The site has no accounts, no payments and no form submissions. If a page, email or message claiming to be Pounamu Atlas asks for any of the above, it is not us; do not provide it.')}</p>`;
  }

  /* ------------------------------------------------------------------ render */
  function render() {
    const main = d.querySelector('main'); if (!main) return;
    const c = CONTENT[page]();
    const toc = c.sections.map(s => `<li><a href="#${s.id}">${s.h}</a></li>`).join('');
    const others = [['about', L('关于我们', 'About us')], ['privacy', L('隐私政策', 'Privacy')], ['terms', L('使用条款', 'Terms')], ['safety', L('安全须知', 'Safety')], ['settings', L('隐私与安全设置', 'Settings')]];
    main.innerHTML = `<article class="v8-doc v7-keep" data-v8="${page}">
      <header class="v8-doc-hero"><p class="v8-doc-label"><span></span>${c.label}</p><h1>${c.title}</h1><p class="v8-doc-lede">${c.lede}</p>${page === 'settings' ? '' : `<p class="v8-doc-meta">${L('最后更新', 'Last updated')} ${UPDATED}</p>`}</header>
      <div class="v8-doc-body">
        <nav class="v8-doc-toc" aria-label="${L('本页目录', 'On this page')}"><p>${L('本页目录', 'On this page')}</p><ol>${toc}</ol><p class="v8-doc-others">${L('相关页面', 'Related')}</p><ul>${others.filter(([k]) => k !== page).map(([k, l]) => `<li><a href="${k}.html${q()}">${l}</a></li>`).join('')}</ul></nav>
        <div class="v8-doc-sections">${c.sections.map(s => `<section id="${s.id}" class="v8-doc-sec"><h2>${s.h}</h2>${typeof s.body === 'function' ? s.body() : s.body}</section>`).join('')}</div>
      </div>
    </article>`;
    if (location.hash) { const t = d.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView({ block: 'start' }), 60); }
  }

  /* ------------------------------------------------------------------ settings actions */
  function status(msg) { const s = d.querySelector('.v8-status'); if (s) s.textContent = msg; }
  function rerender(keepId) { render(); const t = keepId && d.getElementById(keepId); if (t) t.scrollIntoView({ block: 'start' }); }
  d.addEventListener('click', e => {
    const swb = e.target.closest('.v8-switch');
    if (swb) {
      const on = swb.getAttribute('aria-checked') !== 'true';
      swb.setAttribute('aria-checked', String(on));
      const k = swb.dataset.set;
      if (k === 'maps') { set('pounamu-maps', on ? null : 'off'); try { sessionStorage.removeItem('pounamu-maps'); } catch (err) { /* private mode */ } status(on ? L('Google 地图已开启。', 'Google Maps is on.') : L('Google 地图已关闭，其他页面不会再自动连接 Google。', 'Google Maps is off; other pages will not contact Google on their own.')); }
      if (k === 'extwarn') set('pounamu-ext-warn', on ? 'on' : null);
      if (k === 'deck') set('v7-routes-view', on ? null : 'grid');
      if (k === 'motion') { const t = d.getElementById('motionToggle'); const now = (get('nz-slowly-motion') || 'on') !== 'off'; if (t && now !== on) t.click(); else set('nz-slowly-motion', on ? 'on' : 'off'); }
      return;
    }
    const clr = e.target.closest('[data-clear]');
    if (clr) {
      const id = clr.dataset.clear;
      const group = STORE.find(s => s.id === id);
      const label = id === 'all' ? L('本站在此浏览器的全部数据', 'everything this site keeps in this browser') : (zh() ? group.zh : group.en);
      if (!window.confirm(L(`确定清除「${label}」吗？清除后无法恢复。`, `Clear ${label}? This cannot be undone.`))) return;
      const keys = id === 'all' ? STORE.flatMap(s => s.keys) : group.keys;
      keys.forEach(k => set(k, null));
      if (id === 'all') SESSION_KEYS.forEach(k => { try { sessionStorage.removeItem(k); } catch (err) { /* private mode */ } });
      window.dispatchEvent(new Event('v7:nb'));
      rerender('privacy');
      status(L(`已清除：${label}。`, `Cleared: ${label}.`));
      return;
    }
    const exp = e.target.closest('[data-export]');
    if (exp) {
      const raw = get('pounamu-notebook-v1') || '{}';
      const blob = new Blob([raw], { type: 'application/json' });
      const a = d.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'pounamu-notebook-' + new Date().toISOString().slice(0, 10) + '.json';
      d.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      status(L('笔记本已导出为 JSON 文件。', 'Notebook exported as a JSON file.'));
      return;
    }
    if (e.target.closest('[data-lang-switch]')) { const t = d.getElementById('language'); if (t) t.click(); }
  });

  function boot() {
    render();
    const lang = d.getElementById('language');
    if (lang) lang.addEventListener('click', () => setTimeout(render, 60));
    const motion = d.getElementById('motionToggle');
    if (motion) motion.addEventListener('click', () => setTimeout(() => { if (page === 'settings') rerender(); }, 60));
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})();
