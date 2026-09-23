"auto";

/**
 * 英雄杀云手机自动化脚本（V2 注释增强版）
 * ------------------------------------------------------------
 * 目标：从服务端动态领取账号与重逢码，按固定业务流程执行后回传结果。
 *
 * 你给出的业务流程（13 步）：
 * 1. 打开游戏
 * 2. 进入登录页面
 * 3. 选择 QQ 登录
 * 4. 勾选协议
 * 5. 自动拉起登号器
 * 6. 填写账号，点击 op 按钮
 * 7. 进入游戏大厅
 * 8. 点击左下角好友
 * 9. 进入好友页后，点击左侧第二个按钮
 * 10. 弹窗中填入重逢码并点击确定
 * 11. 关闭重试弹窗
 * 12. 返回大厅，进入个人中心并切换账号
 * 13. 返回至登录页面
 *
 * 说明：
 * - 脚本本身支持“动态任务”，不会把账号/重逢码写死。
 * - 需要你根据真机页面，调整 SELECTORS 里的正则文本。
 * - 如果某些页面是游戏自绘（取不到 text/desc），需补 OCR/找图兜底。
 */

/**
 * 全局配置区（先改这里）
 */
const CONFIG = {
  // Java 服务端基础地址（与 README 中接口一致）
  SERVER_BASE: "http://127.0.0.1:8080/api/v1",

  // 若服务端开启 API_KEY，这里填写同样的 key；未开启则留空
  API_KEY: "",

  // 云手机唯一标识（用于服务端分配任务与上报）
  DEVICE_ID: "redfinger-01",

  // 游戏 App 名称（按你云手机实际名称修改）
  GAME_APP_NAME: "英雄杀",

  // 手机桌面上的游戏图标文案兜底（launchApp 失败时用）
  GAME_ICON_TEXT_FALLBACK: /(英雄杀|英雄sha)/,

  // 可选：登号器包名。若你知道包名，填上会更稳（例如 com.xxx.loginhelper）
  // 若留空，脚本会只靠页面元素判断是否进入登号器
  LOGIN_HELPER_PACKAGE: "",

  // 轮询无任务时等待间隔
  POLL_INTERVAL_MS: 5000,

  // 心跳间隔（续租任务）
  HEARTBEAT_INTERVAL_MS: 60000,

  // 单步默认等待超时
  ACTION_TIMEOUT_MS: 15000,

  // 常用短等待，用于点击后 UI 渲染
  PAGE_WAIT_MS: 1200,

  // 点击兜底坐标（比例值：0~1，基于当前屏幕宽高）
  COORD_FALLBACK: {
    // 登录页中 QQ 登录按钮（图2）
    QQ_LOGIN: { x: 0.69, y: 0.84 },
    // 登录页协议勾选框（图2 左下小方框）
    AGREEMENT_CHECKBOX: { x: 0.03, y: 0.92 },
    // 登号器账号输入框（横屏通用估计值，按实测微调）
    LOGIN_HELPER_ACCOUNT_INPUT: { x: 0.50, y: 0.56 },
    // 登号器 OP/登录按钮（横屏通用估计值，按实测微调）
    LOGIN_HELPER_OP_BTN: { x: 0.50, y: 0.76 },
    // 大厅页左侧“好友”（图3）
    FRIEND_BTN: { x: 0.04, y: 0.79 },
    // 好友页左侧第二项“广结好友”（图4）
    LEFT_SECOND_BTN: { x: 0.05, y: 0.36 },
    // 重逢码弹窗输入区（图4 中部输入框）
    REUNION_INPUT: { x: 0.50, y: 0.56 },
    // 重逢码“确认绑定”按钮（图4）
    REUNION_CONFIRM: { x: 0.50, y: 0.76 },
    // 个人中心入口（大厅左上头像区，图3）
    PROFILE_BTN: { x: 0.05, y: 0.07 },
    // 切换账号按钮（图5）
    SWITCH_ACCOUNT_BTN: { x: 0.18, y: 0.68 }
  },

  /**
   * 选择器配置（最关键）
   * 建议先用 Auto.js 布局分析确认真实文案，再逐项替换。
   */
  SELECTORS: {
    // 登录页锚点（只要出现其一就视为在登录页）
    LOGIN_PAGE: /(QQ登录|微信登录|游客登录|快速登录)/,

    // Step 3: QQ 登录按钮
    QQ_LOGIN_BTN: /(QQ登录)/,

    // Step 4: 协议勾选（可选）
    AGREEMENT_CHECKBOX: /(同意|已阅读|用户协议|隐私政策|我已经详细阅读并同意)/,

    // Step 5/6: 登号器账号输入提示
    LOGIN_HELPER_ACCOUNT_HINT: /(账号|QQ号|请输入账号)/,

    // Step 6: 登号器 op/登录按钮
    LOGIN_HELPER_OP_BTN: /(OP|登录|确定|确认)/,

    // Step 7: 大厅锚点
    LOBBY_MARK: /(好友|商城|排位|活动|新手签到|新手任务|召唤)/,

    // Step 8: 左下角好友
    FRIEND_BTN: /(好友)/,

    // Step 9: 左侧第二个按钮（按你的页面文案改）
    LEFT_SECOND_BTN_TEXT: /(广结好友|重逢|召回|回归|老友|换一批)/,

    // Step 10: 重逢码输入框提示
    REUNION_CODE_INPUT_HINT: /(重逢码|邀请码|兑换码|请输入)/,

    // Step 10: 确定/提交
    REUNION_CONFIRM_BTN: /(确认绑定|确定|提交|兑换|确认)/,

    // Step 11: 重试弹窗关闭
    RETRY_POPUP_CLOSE: /(关闭|取消|知道了|X)/,

    // Step 12: 个人中心入口
    PROFILE_BTN: /(头像|个人中心|我的|个人信息)/,

    // Step 12: 切换账号按钮
    SWITCH_ACCOUNT_BTN: /(切换账号|退出登录|注销|切换帐号)/,

    // Step 13: 返回登录页锚点
    BACK_TO_LOGIN_MARK: /(QQ登录|微信登录|游客登录|快速登录|二维码登录)/
  }
};

/**
 * 初始化：无障碍 + 控制台 + 截图权限
 */
auto.waitFor();
console.show();
log("V2 脚本启动。");

let screenshotEnabled = false;
try {
  screenshotEnabled = requestScreenCapture(false);
} catch (e) {
  screenshotEnabled = false;
}

/**
 * 构造请求头。
 */
function buildHeaders() {
  const h = { "Content-Type": "application/json" };
  if (CONFIG.API_KEY && CONFIG.API_KEY.length > 0) {
    h["X-API-Key"] = CONFIG.API_KEY;
  }
  return h;
}

/**
 * 安全解析 JSON，防止后端异常内容直接崩脚本。
 */
function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * 统一 POST JSON。
 */
function httpPostJson(path, payload) {
  const url = CONFIG.SERVER_BASE + path;
  const res = http.postJson(url, payload, { headers: buildHeaders() });
  if (!res) throw new Error("HTTP 请求失败: " + path);
  const body = res.body ? res.body.string() : "";
  return { statusCode: res.statusCode, bodyRaw: body, json: safeJsonParse(body) };
}

/**
 * 统一 GET。
 */
function httpGet(path) {
  const url = CONFIG.SERVER_BASE + path;
  const res = http.get(url, { headers: buildHeaders() });
  if (!res) throw new Error("HTTP 请求失败: " + path);
  const body = res.body ? res.body.string() : "";
  return { statusCode: res.statusCode, bodyRaw: body, json: safeJsonParse(body) };
}

/**
 * 常用等待封装。
 */
function sleepShort(ms) {
  sleep(ms || CONFIG.PAGE_WAIT_MS);
}

/**
 * 点击节点中心点。
 */
function clickCenter(node) {
  if (!node) return false;
  const b = node.bounds();
  return click(b.centerX(), b.centerY());
}

/**
 * 按屏幕比例点击坐标兜底（用于游戏自绘页面无法用 text/desc 时）。
 */
function tapByRatioPoint(point, tag) {
  if (!point) return false;
  const x = Math.floor(device.width * point.x);
  const y = Math.floor(device.height * point.y);
  const ok = click(x, y);
  if (ok) {
    log("坐标兜底点击[" + (tag || "unknown") + "] -> (" + x + "," + y + ")");
    sleepShort();
  }
  return ok;
}

/**
 * 通过 text 正则点击。
 */
function tapByTextRegex(regex, timeoutMs) {
  const node = textMatches(regex).findOne(timeoutMs || 1000);
  if (!node) return false;
  const ok = clickCenter(node);
  if (ok) sleepShort();
  return ok;
}

/**
 * 通过 desc 正则点击（text 失效时兜底）。
 */
function tapByDescRegex(regex, timeoutMs) {
  const node = descMatches(regex).findOne(timeoutMs || 1000);
  if (!node) return false;
  const ok = clickCenter(node);
  if (ok) sleepShort();
  return ok;
}

/**
 * 综合点击：text 优先，desc 兜底。
 */
function tapByRegex(regex, timeoutMs) {
  return tapByTextRegex(regex, timeoutMs) || tapByDescRegex(regex, timeoutMs);
}

/**
 * 先走文案识别点击，失败后走坐标兜底。
 */
function tapWithFallback(regex, point, tag, timeoutMs) {
  const ok = tapByRegex(regex, timeoutMs);
  if (ok) return true;
  return tapByRatioPoint(point, tag);
}

/**
 * 等待页面锚点出现。
 */
function waitByRegex(regex, timeoutMs) {
  const timeout = timeoutMs || CONFIG.ACTION_TIMEOUT_MS;
  if (textMatches(regex).findOne(timeout)) return true;
  return !!descMatches(regex).findOne(300);
}

/**
 * 关闭常见弹窗（启动时很常见）。
 */
function closeCommonPopups(rounds) {
  const n = rounds || 6;
  for (let i = 0; i < n; i++) {
    const acted = tapByRegex(/(同意|允许|确认|继续|跳过|知道了|关闭|X)/, 600);
    if (!acted) break;
  }
}

/**
 * 查找输入框：
 * 1) 直接找 EditText
 * 2) 通过 hint 文案节点向父级回溯再找 EditText
 */
function findInputByHintRegex(regex, timeoutMs) {
  const deadline = new Date().getTime() + (timeoutMs || 6000);
  while (new Date().getTime() < deadline) {
    const direct = className("android.widget.EditText").findOne(500);
    if (direct) return direct;

    const hintNode = textMatches(regex).findOne(300) || descMatches(regex).findOne(300);
    if (hintNode && hintNode.parent()) {
      const parentNode = hintNode.parent();
      const candidate = parentNode.findOne(className("android.widget.EditText"));
      if (candidate) return candidate;
    }
  }
  return null;
}

/**
 * 安全填值：优先 input.setText，失败退化到全局 setText。
 */
function setInputText(inputNode, value) {
  if (!inputNode) return false;
  inputNode.click();
  sleepShort(300);
  try {
    inputNode.setText(value);
    sleepShort(300);
    return true;
  } catch (e) {
    try {
      setText(value);
      sleepShort(300);
      return true;
    } catch (e2) {
      return false;
    }
  }
}

/**
 * 兜底输入：先点击目标输入区域，再尝试全局 setText。
 */
function setInputTextByPoint(point, value, tag) {
  if (!tapByRatioPoint(point, tag)) return false;
  sleepShort(300);
  try {
    setText(value);
    sleepShort(500);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 可选：等待登号器被拉起。
 * - 若配置了 LOGIN_HELPER_PACKAGE，则优先等待包名切换；
 * - 无包名时，退化为等待账号输入框线索。
 */
function waitLoginHelperReady() {
  if (CONFIG.LOGIN_HELPER_PACKAGE && CONFIG.LOGIN_HELPER_PACKAGE.length > 0) {
    const ok = waitForPackage(CONFIG.LOGIN_HELPER_PACKAGE, 8000);
    if (!ok) {
      log("未检测到登号器包名，继续尝试页面元素识别。");
    } else {
      return true;
    }
  }
  if (findInputByHintRegex(CONFIG.SELECTORS.LOGIN_HELPER_ACCOUNT_HINT, 8000)) {
    return true;
  }
  // 兜底：无法识别输入框时，若未进入大厅，则先允许继续执行后续输入兜底逻辑。
  if (!waitByRegex(CONFIG.SELECTORS.LOBBY_MARK, 1000)) {
    log("未识别到登号器输入框，按兜底路径继续。");
    return true;
  }
  return false;
}

/**
 * 失败时保存截图，方便回看为什么没点到。
 */
function saveFailureScreenshot(taskId) {
  if (!screenshotEnabled) return;
  try {
    const image = captureScreen();
    if (!image) return;
    const path = "/sdcard/Download/hs_task_failed_v2_" + taskId + ".png";
    images.save(image, path, "png", 100);
    log("失败截图已保存: " + path);
  } catch (e) {
    log("截图失败: " + e);
  }
}

/**
 * 任务心跳线程：防止任务在服务端被判定超时失效。
 */
function startHeartbeatLoop(taskId, runId, stopRef) {
  return threads.start(function () {
    while (!stopRef.stop) {
      sleep(CONFIG.HEARTBEAT_INTERVAL_MS);
      if (stopRef.stop) break;
      try {
        const res = httpPostJson("/tasks/" + taskId + "/heartbeat", {
          deviceId: CONFIG.DEVICE_ID,
          runId: runId
        });
        log("heartbeat: " + res.bodyRaw);
      } catch (e) {
        log("heartbeat 异常: " + e);
      }
    }
  });
}

/**
 * 向服务端领取任务（动态账号 + 重逢码）。
 */
function claimTask() {
  const res = httpPostJson("/tasks/claim", { deviceId: CONFIG.DEVICE_ID });
  if (res.statusCode !== 200 || !res.json) {
    throw new Error("领取任务失败: " + res.bodyRaw);
  }
  return res.json.task;
}

/**
 * 向服务端上报任务执行结果。
 */
function reportTask(taskId, runId, status, errorMsg) {
  const payload = {
    deviceId: CONFIG.DEVICE_ID,
    runId: runId,
    status: status
  };
  if (errorMsg) payload.error = errorMsg;
  const res = httpPostJson("/tasks/" + taskId + "/report", payload);
  log("report: " + res.bodyRaw);
}

/**
 * =========================
 * 13 步业务流程（按你口述顺序）
 * =========================
 */

// Step 1: 打开游戏
function step01LaunchGame() {
  log("Step1 打开游戏");
  let launched = launchApp(CONFIG.GAME_APP_NAME);
  if (!launched) {
    // 桌面图标兜底：例如“英雄sha”
    log("launchApp 失败，尝试点击桌面图标兜底。");
    launched = tapByRegex(CONFIG.GAME_ICON_TEXT_FALLBACK, 4000);
  }
  if (!launched) {
    throw new Error("无法启动游戏（应用名与图标文案都未命中）。");
  }
  sleep(8000);
  closeCommonPopups(8);
}

// Step 2: 进入登录页面
function step02EnsureLoginPage() {
  log("Step2 进入登录页面");
  if (!waitByRegex(CONFIG.SELECTORS.LOGIN_PAGE, 15000)) {
    throw new Error("未进入登录页面。");
  }
}

// Step 3: 选择 QQ 登录
function step03TapQqLogin() {
  log("Step3 点击 QQ 登录");
  if (!tapWithFallback(
    CONFIG.SELECTORS.QQ_LOGIN_BTN,
    CONFIG.COORD_FALLBACK.QQ_LOGIN,
    "QQ登录",
    6000
  )) {
    throw new Error("未找到 QQ 登录按钮。");
  }
}

// Step 4: 勾选协议（若出现）
function step04AgreeProtocol() {
  log("Step4 勾选协议");
  tapWithFallback(
    CONFIG.SELECTORS.AGREEMENT_CHECKBOX,
    CONFIG.COORD_FALLBACK.AGREEMENT_CHECKBOX,
    "协议勾选",
    3000
  );
}

// Step 5: 自动拉起登号器
function step05WaitLoginHelper() {
  log("Step5 等待登号器拉起");
  if (!waitLoginHelperReady()) {
    throw new Error("登号器未拉起或页面元素不可识别。");
  }
}

// Step 6: 填写账号 + 点击 op 按钮
function step06InputAccountAndSubmit(account) {
  log("Step6 填写账号并提交");
  const accountInput = findInputByHintRegex(CONFIG.SELECTORS.LOGIN_HELPER_ACCOUNT_HINT, 10000);
  if (accountInput) {
    if (!setInputText(accountInput, account)) throw new Error("账号填写失败。");
  } else {
    // 账号输入框识别失败时，尝试用账号输入区坐标兜底
    if (!setInputTextByPoint(CONFIG.COORD_FALLBACK.LOGIN_HELPER_ACCOUNT_INPUT, account, "账号输入框兜底")) {
      throw new Error("未找到账号输入框，且坐标兜底输入失败。");
    }
  }
  if (!tapWithFallback(
    CONFIG.SELECTORS.LOGIN_HELPER_OP_BTN,
    CONFIG.COORD_FALLBACK.LOGIN_HELPER_OP_BTN,
    "OP按钮",
    8000
  )) {
    throw new Error("未找到 op/登录按钮。");
  }
}

// Step 7: 进入游戏大厅
function step07WaitLobby() {
  log("Step7 等待进入大厅");
  if (!waitByRegex(CONFIG.SELECTORS.LOBBY_MARK, 25000)) {
    throw new Error("登录后未进入大厅。");
  }
}

// Step 8: 点击左下角好友
function step08OpenFriendPage() {
  log("Step8 打开好友页");
  if (!tapWithFallback(
    CONFIG.SELECTORS.FRIEND_BTN,
    CONFIG.COORD_FALLBACK.FRIEND_BTN,
    "好友按钮",
    8000
  )) {
    throw new Error("未找到好友按钮。");
  }
  sleep(2200);
}

// Step 9: 点击左侧第二个按钮
function step09TapLeftSecondButton() {
  log("Step9 点击左侧第二个按钮");
  if (!tapWithFallback(
    CONFIG.SELECTORS.LEFT_SECOND_BTN_TEXT,
    CONFIG.COORD_FALLBACK.LEFT_SECOND_BTN,
    "左侧第二按钮",
    7000
  )) {
    throw new Error("未找到左侧第二个目标按钮。");
  }
}

// Step 10: 填入重逢码并确定
function step10InputReunionCodeAndConfirm(reunionCode) {
  log("Step10 填重逢码并确认");
  const codeInput = findInputByHintRegex(CONFIG.SELECTORS.REUNION_CODE_INPUT_HINT, 10000);
  let filled = false;
  if (codeInput) {
    filled = setInputText(codeInput, reunionCode);
  } else {
    filled = setInputTextByPoint(CONFIG.COORD_FALLBACK.REUNION_INPUT, reunionCode, "重逢码输入框");
  }
  if (!filled) throw new Error("重逢码填写失败。");
  if (!tapWithFallback(
    CONFIG.SELECTORS.REUNION_CONFIRM_BTN,
    CONFIG.COORD_FALLBACK.REUNION_CONFIRM,
    "确认绑定",
    6000
  )) {
    throw new Error("未找到重逢码确认按钮。");
  }
}

// Step 11: 关闭重试弹窗
function step11CloseRetryPopup() {
  log("Step11 关闭重试弹窗（若出现）");
  tapByRegex(CONFIG.SELECTORS.RETRY_POPUP_CLOSE, 2500);
  sleepShort(800);
}

// Step 12: 返回大厅 -> 进入个人中心 -> 切换账号
function step12SwitchAccountFromProfile() {
  log("Step12 个人中心切换账号");
  back();
  sleepShort();
  back();
  sleep(1800);

  if (!tapWithFallback(
    CONFIG.SELECTORS.PROFILE_BTN,
    CONFIG.COORD_FALLBACK.PROFILE_BTN,
    "个人中心",
    7000
  )) {
    throw new Error("未找到个人中心入口。");
  }
  sleep(2000);
  if (!tapWithFallback(
    CONFIG.SELECTORS.SWITCH_ACCOUNT_BTN,
    CONFIG.COORD_FALLBACK.SWITCH_ACCOUNT_BTN,
    "切换账号",
    7000
  )) {
    throw new Error("未找到切换账号按钮。");
  }
}

// Step 13: 返回登录页面
function step13EnsureBackToLoginPage() {
  log("Step13 校验回到登录页");
  if (!waitByRegex(CONFIG.SELECTORS.BACK_TO_LOGIN_MARK, 15000)) {
    throw new Error("切换账号后未回到登录页。");
  }
}

/**
 * 单任务执行入口：顺序调用 13 步。
 * 任一步抛错都会被外层捕获并上报 failed。
 */
function runFlowForTask(task) {
  const account = task.account;
  const reunionCode = task.reunionCode;

  step01LaunchGame();
  step02EnsureLoginPage();
  step03TapQqLogin();
  step04AgreeProtocol();
  step05WaitLoginHelper();
  step06InputAccountAndSubmit(account);
  step07WaitLobby();
  step08OpenFriendPage();
  step09TapLeftSecondButton();
  step10InputReunionCodeAndConfirm(reunionCode);
  step11CloseRetryPopup();
  step12SwitchAccountFromProfile();
  step13EnsureBackToLoginPage();
}

/**
 * 主循环：
 * - 健康检查
 * - 领取任务
 * - 执行任务
 * - 上报结果
 * - 循环
 */
function mainLoop() {
  const health = httpGet("/health");
  log("服务健康检查: " + health.bodyRaw);

  while (true) {
    let task = null;
    try {
      task = claimTask();
    } catch (e) {
      log("领取任务异常: " + e);
      sleep(CONFIG.POLL_INTERVAL_MS);
      continue;
    }

    if (!task) {
      log("暂无任务，等待下次轮询...");
      sleep(CONFIG.POLL_INTERVAL_MS);
      continue;
    }

    log("已领取任务 id=" + task.id + " account=" + task.account);

    const stopRef = { stop: false };
    const heartbeatThread = startHeartbeatLoop(task.id, task.runId, stopRef);
    let finalStatus = "done";
    let finalError = "";

    try {
      runFlowForTask(task);
      toast("任务完成: " + task.id);
      log("任务完成: " + task.id);
    } catch (e) {
      finalStatus = "failed";
      finalError = String(e);
      toast("任务失败: " + task.id);
      log("任务失败: " + finalError);
      saveFailureScreenshot(task.id);
    } finally {
      stopRef.stop = true;
      try {
        heartbeatThread.interrupt();
      } catch (ignore) {}
    }

    try {
      reportTask(task.id, task.runId, finalStatus, finalError);
    } catch (e) {
      // 上报失败不终止主循环，避免脚本直接退出。
      log("结果上报异常: " + e);
    }

    sleep(1200);
  }
}

mainLoop();
