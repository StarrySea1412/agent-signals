/* 四枚确定性小样 + 阅读进度条（VOL.08 · 零依赖，全部原生 DOM，无随机数）。 */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sec = (ms) => (ms / 1000).toFixed(2) + "s";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const prog = $("#progress");
  if (prog) {
    const paint = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      prog.style.transform = "scaleX(" + (max > 0 ? h.scrollTop / max : 0) + ")";
    };
    addEventListener("scroll", paint, { passive: true });
    addEventListener("resize", paint, { passive: true });
    paint();
  }

  /* ══ DEMO 01 · 报文解剖台（REST）══ */
  (() => {
    const reqEl = $("#d1-req"), resEl = $("#d1-res");
    if (!reqEl) return;
    let scene = "read", status = 200, picked = null;

    const REQ = {
      read: [
        ["start", "GET /v1/weather?city=beijing HTTP/1.1", "请求行：动词 GET ＋ 名词 /v1/weather ＋ 版本。整句只做一件事：读。"],
        ["hdr", "Host: api.qingzhi.example", "寄给谁。示例域名，真实请求换成你的上游地址。"],
        ["hdr", "Accept: application/json", "我要的货柜格式：JSON。你说人话还是说 JSON，得先讲好。"],
        ["hdr", "User-Agent: qingzhi-agent/0.3 httpx/0.28", "小晴的名片：谁在打电话、用什么库。上游限流常按它统计。"],
        ["gap", "", "这一行空行是报文的分界线：以上是信封，以下是货。GET 没有货，所以到此为止。"],
      ],
      call: [
        ["start", "POST /v1/tools/call HTTP/1.1", "动词 POST：不是来读的，是来触发执行的。工具调用、下单、提交，都用它。"],
        ["hdr", "Host: api.qingzhi.example", "寄给谁。"],
        ["hdr", "Content-Type: application/json", "随信附上的货是 JSON——和 Accept 一个道理，反方向声明一次。"],
        ["hdr", "Authorization: Bearer sk-****（脱敏）", "身份凭证。无状态的全靠它：服务器不记得你，每次都要自报家门。"],
        ["gap", "", "空行分界。POST 下面有货。"],
        ["body", '{"tool": "get_weather", "args": {"city": "beijing"}}', "货本体：调用哪个工具、带什么参数。模型决定调工具，就落在这行 JSON 里。"],
      ],
    };

    const RES = {
      200: [
        ["start", "HTTP/1.1 200 OK", "语气：事情办好了。"],
        ["hdr", "Content-Type: application/json", "货是 JSON。"],
        ["hdr", "Content-Length: 51", "货的尺寸。客户端据此确认收齐。"],
        ["gap", "", "空行分界。"],
        ["body", '{"city":"beijing","temp":18,"wind":"NW-3","aqi":42}', "货本体。模型拿到这个才会接着说话。"],
      ],
      404: [
        ["start", "HTTP/1.1 404 Not Found", "语气：资源不存在。重试也没有用——别重试。"],
        ["hdr", "Content-Type: application/json", "错误也讲格式。"],
        ["gap", "", "空行分界。"],
        ["body", '{"error":"city_not_found","city":"beijng"}', "注意 args：城市名拼错了。Agent 该做的是改参数重问，不是原样再发一遍。"],
      ],
      429: [
        ["start", "HTTP/1.1 429 Too Many Requests", "语气：你话太密了。"],
        ["hdr", "Retry-After: 30", "服务器好心留的字条：歇 30 秒再来。可靠性工程的黄金 20 字符。"],
        ["gap", "", "空行分界。"],
        ["body", '{"error":"rate_limited","scope":"per-key"}', "限流按凭证统计。见到 429 立刻重试 = 排队插队，只会更黑。"],
      ],
      500: [
        ["start", "HTTP/1.1 500 Internal Server Error", "语气：我这边出事了，不是你的错。"],
        ["hdr", "Content-Type: application/json", "——"],
        ["gap", "", "空行分界。"],
        ["body", '{"error":"upstream_timeout","stage":"fetch"}', "上游超时。正确动作：指数退避、换个时间窗重试，而不是立刻再撞一次。"],
      ],
    };

    const NOTE = {
      200: "200 走正流程：把 JSON 里的温度、风力交回给模型，让它组织成人话。",
      404: "404 是「别重试」的语气——问题在参数不在网络。把它原样转告模型，让它改。",
      429: "429 拆开读：先看 Retry-After，睡够再试。立刻重试的 Agent 只会被拉黑得更彻底。",
      500: "500 说明服务器-side 出事。指数退避（1s → 2s → 4s）换个窗口，别原地硬撞。",
    };

    const CLS = { start: "st-line", hdr: "hd-line", gap: "gap-line", body: "bd-line" };

    function wire(el, rows) {
      el.innerHTML = rows.map(([k, txt, note]) =>
        k === "gap"
          ? `<div class="wrow ${CLS[k]}" data-note="${esc(note)}"><span class="wgap">· · ·</span><span class="wnote">空行</span></div>`
          : `<div class="wrow ${CLS[k]}" data-note="${esc(note)}"><span>${esc(txt)}</span></div>`
      ).join("");
    }

    function render() {
      picked = null;
      wire(reqEl, REQ[scene]);
      wire(resEl, RES[status]);
      const tag = $("#d1-codetag");
      tag.textContent = status === 200 ? "200 OK" : status === 404 ? "404 Not Found"
        : status === 429 ? "429 Too Many Requests" : "500 Internal Server Error";
      tag.className = "st-" + status;
      $("#d1-reqline").textContent = scene === "read" ? "GET /v1/weather?city=beijing" : "POST /v1/tools/call";
      $("#d1-note").textContent = NOTE[status];
    }

    $$("#d1-scene button").forEach((b) => b.addEventListener("click", () => {
      $$("#d1-scene button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      scene = b.dataset.scene; render();
    }));
    $$("#d1-status button").forEach((b) => b.addEventListener("click", () => {
      $$("#d1-status button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      status = +b.dataset.status; render();
    }));
    const NOTE_HEAD = { "st-line": "① 请求行 / 状态行", "hd-line": "② header：信封", "gap-line": "③ 空行：信封与货的分界", "bd-line": "④ body：货" };
    [reqEl, resEl].forEach((el) => el.addEventListener("click", (e) => {
      const row = e.target.closest(".wrow"); if (!row) return;
      $$(".wrow", el).forEach((r) => r.classList.remove("pick"));
      if (picked === row) { picked = null; return; }
      picked = row; row.classList.add("pick");
      $("#d1-note").textContent = NOTE_HEAD[row.className.split(" ")[1] || "st-line"] + " — " + row.dataset.note;
    }));
    render();
  })();

  /* ══ DEMO 02 · 首字竞速台（SSE）══ */
  (() => {
    const root = $("#demo2"); if (!root) return;
    const ANSWER = "北京今天晴，18°C，西北风三级，湿度 40%，空气质量优。清晨六到九点风小凉爽，适合慢跑；午后升温到 22°C，紫外线偏强，建议改约傍晚。";
    const TTFT_MODEL = 250; // 模型吐出第一个 token 的固定耗时
    const speed = $("#d2-speed"), rtt = $("#d2-rtt"), len = $("#d2-len");
    let runId = 0;

    const sync = () => {
      $("#d2-v-speed").textContent = speed.value + " tok/s";
      $("#d2-v-rtt").textContent = rtt.value + " ms";
      $("#d2-v-len").textContent = len.value + " tok";
    };
    [speed, rtt, len].forEach((i) => i.addEventListener("input", sync)); sync();

    function plan() {
      const S = +speed.value, R = +rtt.value, N = +len.value;
      const gen = N / S * 1000;                       // 生成总耗时
      const aFirst = R + TTFT_MODEL + gen;            // 甲：全部生成完才见字
      const bFirst = R + TTFT_MODEL;                  // 乙：首事件到达
      const events = [];                              // 每 3 tok 一个事件
      for (let i = 3; i <= N; i += 3) events.push({ t: bFirst + (i / S * 1000 - TTFT_MODEL) * (i / N), tok: i });
      const bEnd = R + TTFT_MODEL + gen;              // 流式最后一包（含单程尾差）
      return { S, R, N, gen, aFirst, bFirst, bEnd, events };
    }

    function sliceText(N) {
      const chars = ANSWER.replace(/[，。；：]/g, (m) => m + "\u0001").split("\u0001").filter(Boolean);
      // 把回答切成 N 个 token 片：按字符均匀切
      const total = ANSWER.length, out = [];
      let idx = 0;
      for (let i = 1; i <= N; i++) {
        const cut = Math.round(total * i / N);
        out.push(ANSWER.slice(idx, cut)); idx = cut;
      }
      if (idx < total) out[out.length - 1] += ANSWER.slice(idx);
      return out;
    }

    function run() {
      const id = ++runId;
      const P = plan(), pieces = sliceText(P.N);
      const trackA = $("#d2-lane-a .track"), trackB = $("#d2-lane-b .track");
      trackA.querySelectorAll(".pkt,.pkt-big").forEach((n) => n.remove());
      trackB.querySelectorAll(".pkt,.pkt-big").forEach((n) => n.remove());
      $("#d2-lane-a .fill").style.width = "0%";
      $("#d2-lane-b .fill").style.width = "0%";
      $("#d2-ttft-a").textContent = "TTFT —"; $("#d2-ttft-b").textContent = "TTFT —";
      $("#d2-out-a").innerHTML = '<span class="ph">（还在等待整段……）</span>';
      $("#d2-out-b").innerHTML = '<span class="ph">（等待首字……）</span>';
      $("#d2-log").innerHTML = "";
      const end = P.aFirst + 400;
      const dil = Math.max(2, end / 4200);            // 时间压缩：回放不超过 ~4s，数字仍按真实值显示
      const t0 = performance.now();
      let shownA = false, firstB = false, logAt = 0;
      const LOG_TOTAL = 9;
      const log = $("#d2-log");

      function frame(now) {
        if (id !== runId) return;
        const t = (now - t0) * dil;
        // 甲：生成进度（0→100%），最后一次寄出
        const pa = clamp((t - P.R) / P.gen, 0, 1) * 100;
        $("#d2-lane-a .fill").style.width = pa + "%";
        if (t >= P.aFirst && !shownA) {
          shownA = true;
          const big = document.createElement("span"); big.className = "pkt-big"; big.style.left = "calc(100% - 26px)";
          trackA.appendChild(big);
          $("#d2-out-a").textContent = ANSWER;
          $("#d2-ttft-a").textContent = "TTFT " + sec(P.aFirst);
        }
        // 乙：事件逐个到达
        const arrived = P.events.filter((e) => e.t <= t);
        const pb = (arrived.length / P.events.length) * 100;
        $("#d2-lane-b .fill").style.width = pb + "%";
        if (arrived.length) {
          const last = arrived[arrived.length - 1].tok;
          $("#d2-out-b").textContent = pieces.slice(0, last).join("");
          const wantPkts = Math.min(arrived.length, 26);
          const have = trackB.querySelectorAll(".pkt").length;
          for (let i = have; i < wantPkts; i++) {
            const pk = document.createElement("span"); pk.className = "pkt";
            pk.style.left = (P.events[Math.min(i * 3, P.events.length - 1)].t / end) * 100 + "%";
            trackB.appendChild(pk);
          }
        }
        if (t >= P.bFirst && !firstB) { firstB = true; $("#d2-ttft-b").textContent = "TTFT " + sec(P.bFirst); }
        // SSE 日志：均匀抽 9 条回放
        const step = Math.max(1, Math.floor(P.events.length / LOG_TOTAL));
        const shown = P.events.filter((e, i) => i % step === 0 && e.t <= t).length;
        if (shown > logAt) {
          for (let i = logAt; i < shown && i < P.events.length; i += step) {
            const e = P.events[i];
            const txt = (e.tok * 3 >= P.N + 3) ? "data: [DONE]"
              : "data: {\"delta\": \"" + pieces.slice(e.tok - 3, e.tok).join("") + "\"}";
            log.insertAdjacentHTML("beforeend",
              `<div class="wrow bd-line"><span class="wt">${sec(e.t)}</span><span>${esc(txt)}</span></div>`);
            log.scrollTop = log.scrollHeight;
            logAt = i + 1;
          }
        }
        if (t < end) requestAnimationFrame(frame);
        else {
          $("#d2-na").textContent = sec(P.aFirst);
          $("#d2-nb").textContent = sec(P.bFirst);
          $("#d2-nc").textContent = "×" + (P.aFirst / P.bFirst).toFixed(1);
          $("#d2-nd").textContent = "同时 · " + sec(P.aFirst);
        }
      }
      requestAnimationFrame(frame);
    }
    $("#d2-run").addEventListener("click", run);
  })();

  /* ══ DEMO 03 · 双工对讲机（WebSocket）══ */
  (() => {
    const root = $("#demo3"); if (!root) return;
    let mode = "half", beat = false, runId = 0;

    // 剧本：t0, t1(秒), 谁谁, 什么块, 文案。全部确定性。
    function script(m) {
      const half = [
        [0.0, 0.6, "you", "talk", "说需求（查天气＋跑步建议）"],
        [0.6, 0.75, "ctl", "send", "整段听完才发出"],
        [0.75, 1.4, "ai", "think", "思考"],
        [1.4, 3.9, "ai", "talk", "生成并播报回答（第一轮，没有紫外线数据）"],
        [1.5, 3.9, "you", "queue", "插话：「还有紫外线指数吗」——半双工，排不进话"],
        [3.9, 4.05, "ctl", "send", "这才发出"],
        [4.05, 4.6, "ai", "think", "再想一轮"],
        [4.6, 6.4, "ai", "talk", "第二轮回答：补上紫外线"],
      ];
      const full = [
        [0.0, 0.6, "you", "talk", "说需求（边说边作为帧送达）"],
        [0.35, 0.6, "ai", "think", "边听边想"],
        [0.6, 3.1, "ai", "talk", "生成并播报回答"],
        [1.5, 1.62, "you", "talk", "插话一帧，当场送达"],
        [1.62, 1.9, "ai", "fix", "改道：并入紫外线"],
        [1.9, 3.1, "ai", "talk", "继续播报（已含紫外线）"],
      ];
      return m === "half" ? half : full;
    }

    const CLS = { talk: "blk", think: "blk soft", fix: "blk fix", queue: "blk ghost", send: "blk send", ping: "blk ping", lost: "blk lost", re: "blk re" };

    function render(cut) {
      const rows = { you: $("#d3-row-you"), ai: $("#d3-row-ai"), ctl: $("#d3-row-ctl") };
      Object.values(rows).forEach((r) => r.innerHTML = "");
      const scriptRows = script(mode).filter((r) => !(cut && r[0] >= cut.t && mode === "full"));
      const endT = mode === "half" ? 6.4 : (cut ? cut.newEnd : 3.1);
      for (const [t0, t1, who, kind, text] of scriptRows) {
        const d = document.createElement("div");
        d.className = CLS[kind] + (who === "you" ? " by-you" : who === "ai" ? " by-ai" : " by-ctl");
        d.style.left = (t0 / endT * 100) + "%";
        d.style.width = Math.max((t1 - t0) / endT * 100, 7.5) + "%";
        d.innerHTML = `<span>${esc(text)}</span>`;
        d.title = t0.toFixed(2) + "s – " + t1.toFixed(2) + "s";
        rows[who].appendChild(d);
      }
      // 心跳与断线只画在线路道
      if (beat && mode === "full") {
        for (let t = 1; t < endT; t += 3) {
          const d = document.createElement("div");
          d.className = CLS.ping; d.style.left = (t / endT * 100) + "%"; d.style.width = (1.1 / endT * 100) + "%";
          d.innerHTML = "<span>PING→PONG</span>"; rows.ctl.appendChild(d);
        }
      }
      if (cut && mode === "full") {
        const d = document.createElement("div");
        d.className = CLS.lost; d.style.left = (cut.t / endT * 100) + "%"; d.style.width = ((cut.t + 1.2) / endT * 100 - cut.t / endT * 100) + "%";
        d.innerHTML = "<span>CONNECTION LOST —— 1.2s 后重连；断线期间的帧不补发，需重新同步</span>";
        rows.ctl.appendChild(d);
      }
      $("#d3-ruler").innerHTML = Array.from({ length: 8 }, (_, i) => `<span>${(i * endT / 7).toFixed(1)}s</span>`).join("");
      if (mode === "half") {
        $("#d3-na").textContent = "6.40s"; $("#d3-nb").textContent = "2.40s 后"; $("#d3-nc").textContent = "100%（两轮凑齐）";
        $("#d3-note").textContent = "半双工：插话排到第一轮结束才被听见，多付两轮往返。";
      } else {
        $("#d3-na").textContent = cut ? sec(cut.newEnd * 1000) : "3.10s";
        $("#d3-nb").textContent = "0.12s 内"; $("#d3-nc").textContent = "100%（一轮内）";
        $("#d3-note").textContent = cut
          ? "断线重连后，2.0s–3.2s 之间应送达的帧永远丢了——这是和 SSE 内建续传最本质的差别。"
          : "全双工：插话一帧送达，回答当场改道，一轮收工。";
      }
      $("#d3-cut").disabled = mode !== "full" || !!cut;
      $("#d3-cut").textContent = cut ? "已断线——重置再看" : "模拟断线";
    }

    $("#d3-mode").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      $$("#d3-mode button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      mode = b.dataset.mode;
      runId++; render(null);
    });
    $("#d3-heart").addEventListener("change", (e) => { beat = e.target.checked; render(currentCut); });
    $("#d3-run").addEventListener("click", () => { currentCut = null; render(null); });
    let currentCut = null;
    $("#d3-cut").addEventListener("click", () => {
      if (currentCut) { currentCut = null; render(null); return; }
      currentCut = { t: 2.0, newEnd: 4.3 };
      render(currentCut);
    });
    render(null);
  })();

  /* ══ DEMO 04 · 选型法庭 ══ */
  (() => {
    const root = $("#demo4"); if (!root) return;
    const CASES = [
      { t: "手机 App 启动时拉取今天的天气", d: "一次查询，拿到数据就渲染首屏。没有人在等流，也没有人想插话。", best: "rest", ok: null, pts: 2,
        why: { rest: "✅ 最优。一问一答，答完即走——这是 REST 的主场，也是小晴第一棒的原型。", sse: "❌ 方向反了：SSE 是服务器往外推，这里是客户端往里拉。", ws: "❌ 杀鸡用牛刀：为一次查询握手建长连，握手的成本比查询本身还贵。" },
        ref: "参照：几乎所有天气/行情类 App 的首屏请求。" },
      { t: "聊天产品里，模型的回答逐字浮现", d: "一段几百 token 的回答，用户想边生成边看，不想盯着转圈。", best: "sse", ok: null, pts: 2,
        why: { rest: "❌ 能做，但用户要等整段生成完——TTFT 直接糊脸（回到 DEMO 02 拖一次就懂）。", sse: "✅ 最优。单向流刚好够用，HTTP 基础设施全兼容，断线还送自动续传。", ws: "🤔 能做但过重：双向能力闲置，还要自管心跳与重连；很多老代理还会拦握手。" },
        ref: "参照：各家模型 API 的 stream=true，底层全是 text/event-stream。" },
      { t: "语音助手实时对话，用户能随时打断", d: "音频帧高频双向流动，用户说话时助手要立刻停下听。", best: "ws", ok: null, pts: 2,
        why: { rest: "❌ 半双工注定无法打断：回答一旦开始，你的输入只能等下一轮（回到 DEMO 03 看排队）。", sse: "❌ 只出不进：语音是双向流，缺的那条进线正是「打断」。", ws: "✅ 最优。全双工＋帧头只有几字节，音频流和打断帧同线走。" },
        ref: "参照：OpenAI Realtime API 等语音实时产品走的都是 WebSocket。" },
      { t: "上传一批文件，进度条从 0% 涨到 100%", d: "服务器处理很久，网页要实时显示进度，但用户不需要中途插话。", best: "sse", ok: "ws", pts: 2,
        why: { rest: "🤔 轮询也能凑合，但每次轮询都是完整请求，进度密时既吵又卡。", sse: "✅ 最优。单向推送刚好够，连接普通 HTTP，进度事件一包一包推下来。", ws: "🟡 可行但过重（1 分）：双向能力闲置，还得自管心跳重连——杀鸡用牛刀。" },
        ref: "参照：主流网盘/导出任务的进度推送。" },
      { t: "小晴每小时从汇率服务拉一次价格表", d: "调用方是程序不是人：没有首字延迟焦虑，一小时一次，错过一秒无所谓。", best: "rest", ok: null, pts: 2,
        why: { rest: "✅ 最优。定时任务＋一次查询＝cron + httpx，一条请求的事。", sse: "❌ 为了每小时一句保持一条永久连接，服务器直呼冤枉。", ws: "❌ 同上，还更贵。" },
        ref: "参照：后端之间的同步任务，教科书式 REST。" },
      { t: "协作白板：两个人同时拖动同一个图形", d: "毫秒级互见，任何一边的运动都要即时映到对方屏幕上。", best: "ws", ok: null, pts: 2,
        why: { rest: "❌ 每秒几十次的移动事件，整份报文来回，延迟和开销都爆炸。", sse: "❌ 只能单边推，另一边的动作发不出去——白板缺一半就不成白板。", ws: "✅ 最优。高频小帧＋双向，正是帧协议的设计目标。" },
        ref: "参照：Figma 类协同产品的实时通道。" },
    ];
    let idx = 0, score = 0, answered = false, finished = false;
    const btns = $$("#d4-btns button");

    function show() {
      const c = CASES[idx];
      $("#d4-no").textContent = `案件 ${idx + 1} / ${CASES.length}`;
      $("#d4-title").textContent = c.t;
      $("#d4-desc").textContent = c.d;
      $("#d4-verdict").textContent = "选一条，判决马上到。";
      $("#d4-verdict").className = "court-verdict";
      btns.forEach((b) => { b.disabled = false; b.classList.remove("good", "bad", "meh"); });
      $("#d4-next").disabled = true;
      $("#d4-next").textContent = idx === CASES.length - 1 ? "看成绩 →" : "下一案 →";
      answered = false;
    }
    btns.forEach((b) => b.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const c = CASES[idx], pick = b.dataset.p;
      const good = pick === c.best, meh = pick === c.ok;
      score += good ? c.pts : meh ? 1 : 0;
      $("#d4-score").textContent = score;
      b.classList.add(good ? "good" : meh ? "meh" : "bad");
      btns.forEach((x) => { if (x.dataset.p === c.best) x.classList.add("good"); x.disabled = true; });
      const v = $("#d4-verdict");
      v.innerHTML = esc(c.why[pick]) + `<small>${esc(c.ref)}</small>`;
      v.className = "court-verdict " + (good ? "good" : meh ? "meh" : "bad");
      $("#d4-next").disabled = false;
    }));
    $("#d4-next").addEventListener("click", () => {
      if (finished) { finished = false; idx = 0; score = 0; $("#d4-score").textContent = "0"; show(); return; }
      if (idx < CASES.length - 1) { idx++; show(); }
      else {
        const rank = score >= 10 ? "信号工执业资格到手" : score >= 7 ? "能上岗，细节再补" : "回炉三条线，再来一遍";
        $("#d4-no").textContent = "庭审结束";
        $("#d4-title").textContent = `最终得分 ${score} / 12`;
        $("#d4-desc").textContent = rank + "——错过的题回到对应章节，把报文和时序再看一遍。";
        $("#d4-verdict").textContent = "点「重新开庭」再来一轮。";
        $("#d4-verdict").className = "court-verdict";
        $("#d4-next").textContent = "重新开庭 →";
        finished = true;
      }
    });
    show();
  })();
})();
