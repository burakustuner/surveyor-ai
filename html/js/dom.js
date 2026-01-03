/** -------------------------
 *  DOM Element References
 *  ------------------------- */
let chatEl = null;
let msgEl = null;
let modelEl = null;
let modelHintEl = null;
let templateEl = null;
let ctxEl = null;
let tempEl = null;
let historyLimitEl = null;
let ctxPill = null;
let tempPill = null;
let streamPill = null;
let toggleStreamBtn = null;
let newChatBtn = null;
let clearChatBtn = null;
let sendBtnTop = null;
let rightHint = null;
let sessionsEl = null;
let sessCountEl = null;
let chatTitleEl = null;
let chatSubEl = null;
let topCtx = null;
let topTemp = null;
let statusDot = null;
let modalWrap = null;
let openSettingsBtn = null;
let closeSettingsBtn = null;
let saveSettingsBtn = null;
let templateTextEl = null;
let newTemplateNameEl = null;
let newTemplateTextEl = null;
let addTemplateBtn = null;
let deleteTemplateBtn = null;
let loginSection = null;
let userSection = null;
let googleSignInBtn = null;
let googleSignOutBtn = null;
let userNameEl = null;
let userEmailEl = null;
let userPictureEl = null;
let rateLimitInfoEl = null;

export function initDOM() {
  chatEl = document.getElementById("chat");
  msgEl = document.getElementById("msg");
  modelEl = document.getElementById("model");
  modelHintEl = document.getElementById("modelHint");
  templateEl = document.getElementById("template");
  ctxEl = document.getElementById("ctx");
  tempEl = document.getElementById("temp");
  historyLimitEl = document.getElementById("historyLimit");
  ctxPill = document.getElementById("ctxPill");
  tempPill = document.getElementById("tempPill");
  streamPill = document.getElementById("streamPill");
  toggleStreamBtn = document.getElementById("toggleStream");
  newChatBtn = document.getElementById("newChat");
  clearChatBtn = document.getElementById("clearChat");
  sendBtnTop = document.getElementById("sendTop");
  rightHint = document.getElementById("rightHint");
  sessionsEl = document.getElementById("sessions");
  sessCountEl = document.getElementById("sessCount");
  chatTitleEl = document.getElementById("chatTitle");
  chatSubEl = document.getElementById("chatSub");
  topCtx = document.getElementById("topCtx");
  topTemp = document.getElementById("topTemp");
  statusDot = document.getElementById("statusDot");
  modalWrap = document.getElementById("modalWrap");
  openSettingsBtn = document.getElementById("openSettings");
  closeSettingsBtn = document.getElementById("closeSettings");
  saveSettingsBtn = document.getElementById("saveSettings");
  templateTextEl = document.getElementById("templateText");
  newTemplateNameEl = document.getElementById("newTemplateName");
  newTemplateTextEl = document.getElementById("newTemplateText");
  addTemplateBtn = document.getElementById("addTemplate");
  deleteTemplateBtn = document.getElementById("deleteTemplate");
  loginSection = document.getElementById("loginSection");
  userSection = document.getElementById("userSection");
  googleSignInBtn = document.getElementById("googleSignIn");
  googleSignOutBtn = document.getElementById("googleSignOut");
  userNameEl = document.getElementById("userName");
  userEmailEl = document.getElementById("userEmail");
  userPictureEl = document.getElementById("userPicture");
  rateLimitInfoEl = document.getElementById("rateLimitInfo");
}

export function getChatEl() { return chatEl; }
export function getMsgEl() { return msgEl; }
export function getModelEl() { return modelEl; }
export function getModelHintEl() { return modelHintEl; }
export function getTemplateEl() { return templateEl; }
export function getCtxEl() { return ctxEl; }
export function getTempEl() { return tempEl; }
export function getHistoryLimitEl() { return historyLimitEl; }
export function getCtxPill() { return ctxPill; }
export function getTempPill() { return tempPill; }
export function getStreamPill() { return streamPill; }
export function getToggleStreamBtn() { return toggleStreamBtn; }
export function getNewChatBtn() { return newChatBtn; }
export function getClearChatBtn() { return clearChatBtn; }
export function getSendBtnTop() { return sendBtnTop; }
export function getRightHint() { return rightHint; }
export function getSessionsEl() { return sessionsEl; }
export function getSessCountEl() { return sessCountEl; }
export function getChatTitleEl() { return chatTitleEl; }
export function getChatSubEl() { return chatSubEl; }
export function getTopCtx() { return topCtx; }
export function getTopTemp() { return topTemp; }
export function getStatusDot() { return statusDot; }
export function getModalWrap() { return modalWrap; }
export function getOpenSettingsBtn() { return openSettingsBtn; }
export function getCloseSettingsBtn() { return closeSettingsBtn; }
export function getSaveSettingsBtn() { return saveSettingsBtn; }
export function getTemplateTextEl() { return templateTextEl; }
export function getNewTemplateNameEl() { return newTemplateNameEl; }
export function getNewTemplateTextEl() { return newTemplateTextEl; }
export function getAddTemplateBtn() { return addTemplateBtn; }
export function getDeleteTemplateBtn() { return deleteTemplateBtn; }
export function getLoginSection() { return loginSection; }
export function getUserSection() { return userSection; }
export function getGoogleSignInBtn() { return googleSignInBtn; }
export function getGoogleSignOutBtn() { return googleSignOutBtn; }
export function getUserNameEl() { return userNameEl; }
export function getUserEmailEl() { return userEmailEl; }
export function getUserPictureEl() { return userPictureEl; }
export function getRateLimitInfoEl() { return rateLimitInfoEl; }
export function getRightHintEl() { return rightHint; }
export function getStatusDotEl() { return statusDot; }

export function autoGrow() {
  if (msgEl) {
    msgEl.style.height = "auto";
    msgEl.style.height = Math.min(msgEl.scrollHeight, 180) + "px";
  }
}

