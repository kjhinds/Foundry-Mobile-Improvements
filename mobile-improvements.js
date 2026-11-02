import { __classPrivateFieldSet, __classPrivateFieldGet } from './vendor.js';

const preloadTemplates = async function () {
    const templatePaths = [
        "modules/mobile-improvements/templates/window-selector.hbs",
        "modules/mobile-improvements/templates/navigation.hbs",
        "modules/mobile-improvements/templates/menu.hbs",
    ];
    //@ts-expect-error
    return foundry.applications.handlebars.loadTemplates(templatePaths);
};

const MODULE_NAME = "mobile-improvements"; // TODO: Better handling
var settings;
(function (settings) {
    // In config
    settings["SIDEBAR_PAUSES_RENDER"] = "sideBarPausesRender";
    settings["SHOW_MOBILE_TOGGLE"] = "showMobileToggle";
    settings["SHOW_CHAT_ON_ROLL"] = "showChatOnRoll";
    settings["SHOW_ROLL_BUBBLES"] = "showRollBubbles";
    // Not in config
    settings["SHOW_PLAYER_LIST"] = "showPlayerList";
    settings["PIN_MOBILE_MODE"] = "pinMobileMode";
    settings["WINDOWS_ZOOM_VALUES"] = "windowZoomValues";
})(settings || (settings = {}));
const moduleSettings = [
    {
        setting: settings.SIDEBAR_PAUSES_RENDER,
        name: "MOBILEIMPROVEMENTS.SettingsPauseRendering",
        hint: "MOBILEIMPROVEMENTS.SettingsPauseRenderingHint",
        type: Boolean,
        default: false,
    },
    {
        setting: settings.SHOW_MOBILE_TOGGLE,
        name: "MOBILEIMPROVEMENTS.SettingsShowToggle",
        hint: "MOBILEIMPROVEMENTS.SettingsShowToggleHint",
        type: Boolean,
        default: false,
        scope: "world",
    },
    {
        setting: settings.SHOW_CHAT_ON_ROLL,
        name: "MOBILEIMPROVEMENTS.SettingsShowChatOnRoll",
        hint: "MOBILEIMPROVEMENTS.SettingsShowChatOnRollHint",
        type: Boolean,
        default: false,
        scope: "world",
    },
    {
        setting: settings.SHOW_ROLL_BUBBLES,
        name: "MOBILEIMPROVEMENTS.SettingsShowRollBubbles",
        hint: "MOBILEIMPROVEMENTS.SettingsShowRollBubblesHint",
        type: Boolean,
        default: true,
        scope: "client",
    },
    {
        setting: settings.SHOW_PLAYER_LIST,
        type: Boolean,
        default: false,
        config: false,
    },
    {
        setting: settings.PIN_MOBILE_MODE,
        type: Boolean,
        default: false,
        config: false,
    },
    {
        setting: settings.WINDOWS_ZOOM_VALUES,
        type: Object,
        default: {},
        config: false,
    },
];
function registerSetting(callbacks, { setting, ...options }) {
    game.settings.register(MODULE_NAME, setting, {
        config: true,
        scope: "client",
        ...options,
        onChange: callbacks[setting] || undefined,
    });
}
function registerSettings(callbacks = {}) {
    moduleSettings.forEach((item) => {
        registerSetting(callbacks, item);
    });
}
function getSetting(setting) {
    return game.settings.get(MODULE_NAME, setting);
}
function setSetting(setting, value) {
    return game.settings.set(MODULE_NAME, setting, value);
}

var _WindowV2_id;
// WindowManager is a singleton that allows management of application windows
function activate() {
    if (!window.WindowManager) {
        window.WindowManager = new WindowManager();
    }
}
function getManager() {
    if (!window.WindowManager) {
        activate();
    }
    return window.WindowManager;
}
class Window {
    constructor(app) {
        this.app = app;
    }
    get title() {
        return this.app.title;
    }
    get id() {
        return this.app.appId;
    }
    get minimized() {
        // @ts-ignore
        return this.app._minimized;
    }
    show() {
        if (this.minimized) {
            this.app.maximize();
        }
        this.app.bringToTop();
    }
    minimize() {
        this.app.minimize();
    }
    close() {
        this.app.close();
    }
}
function v2AppId(app) {
    return "v2_" + app.id;
}
class WindowV2 {
    constructor(app) {
        _WindowV2_id.set(this, void 0);
        this.app = app;
        __classPrivateFieldSet(this, _WindowV2_id, v2AppId(app), "f");
    }
    get title() {
        return this.app.title;
    }
    get id() {
        return __classPrivateFieldGet(this, _WindowV2_id, "f");
    }
    get minimized() {
        return this.app.minimized;
    }
    show() {
        if (this.minimized) {
            this.app.maximize();
        }
        this.app.bringToFront();
    }
    minimize() {
        this.app.minimize();
    }
    close() {
        this.app.close();
    }
}
_WindowV2_id = new WeakMap();
class WindowManager {
    constructor() {
        // All windows
        this.windows = {};
        this.version = "1.0";
        this.windowChangeHandler = {
            set: (target, property, value) => {
                target[property] = value;
                this.windowAdded(parseInt(property));
                // Hook for new window being rendered
                Hooks.once("render" + value.constructor.name, (app) => this.newWindowRendered(app.appId));
                return true;
            },
            deleteProperty: (target, property) => {
                const res = delete target[property];
                setTimeout(() => {
                    this.windowRemoved(parseInt(property));
                }, 1);
                return res;
            },
        };
        this.augmentAppV1();
        this.augmentAppV2();
        console.info("Window Manager | Initiated");
        Hooks.call("WindowManager:Init");
    }
    augmentAppV1() {
        ui.windows = new Proxy(ui.windows, this.windowChangeHandler);
        const WM = this;
        window.libWrapper.register("mobile-improvements", "Application.prototype.bringToTop", function () {
            WM.windowBroughtToTop(this.appId);
        }, "LISTENER");
        window.libWrapper.register("mobile-improvements", "Application.prototype.minimize", function () {
            WM.windowMinimized(this.appId);
        }, "LISTENER");
        window.libWrapper.register("mobile-improvements", "Application.prototype.maximize", function () {
            WM.windowMaximized(this.appId);
        }, "LISTENER");
    }
    augmentAppV2() {
        //@ts-ignore
        if (!globalThis.foundry?.applications?.api?.ApplicationV2) {
            return;
        }
        Hooks.on("renderApplicationV2", (app) => {
            if (app.options?.window?.frame === false ||
                app.options?.window?.minimizable === false) {
                return;
            }
            const newWindow = this.windowV2Added(app);
            app.element?.classList.add("wm-managed");
            newWindow && this.newWindowRendered(newWindow.id);
        });
        const WM = this;
        window.libWrapper.register("mobile-improvements", "foundry.applications.api.ApplicationV2.prototype.bringToFront", function () {
            WM.windowBroughtToTop(v2AppId(this));
        }, "LISTENER");
        window.libWrapper.register("mobile-improvements", "foundry.applications.api.ApplicationV2.prototype.minimize", function () {
            WM.windowMinimized(v2AppId(this));
        }, "LISTENER");
        window.libWrapper.register("mobile-improvements", "foundry.applications.api.ApplicationV2.prototype.maximize", function () {
            WM.windowMaximized(v2AppId(this));
        }, "LISTENER");
        window.libWrapper.register("mobile-improvements", "foundry.applications.api.ApplicationV2.prototype.close", function () {
            WM.windowRemoved(v2AppId(this));
        }, "LISTENER");
    }
    newWindowRendered(appId) {
        Hooks.call("WindowManager:WindowRendered", appId);
    }
    windowAdded(appId) {
        if (this.windows[appId] ||
            ui.windows[appId].constructor.name
                .toLowerCase()
                .includes("windowcontrols"))
            return;
        this.windows[appId] = new Window(ui.windows[appId]);
        Hooks.call("WindowManager:Added", appId);
    }
    windowV2Added(app) {
        const appId = v2AppId(app);
        if (this.windows[appId]?.app === app)
            return;
        const previous = this.windows[appId];
        this.windows[appId] = new WindowV2(app);
        if (previous) {
            Hooks.call("WindowManager:Removed", appId);
        }
        Hooks.call("WindowManager:Added", appId);
        return this.windows[appId];
    }
    windowRemoved(appId) {
        delete this.windows[appId];
        Hooks.call("WindowManager:Removed", appId);
        this.checkEmpty();
    }
    windowBroughtToTop(appId) {
        Hooks.call("WindowManager:BroughtToTop", appId);
    }
    windowMinimized(appId) {
        Hooks.call("WindowManager:Minimized", appId);
        this.checkEmpty();
    }
    windowMaximized(appId) {
        Hooks.call("WindowManager:Maximized", appId);
    }
    checkEmpty() {
        const windows = Object.values(this.windows);
        if (windows.length === 0 || windows.every((w) => w.minimized)) {
            Hooks.call("WindowManager:NoneVisible");
        }
    }
    minimizeAll() {
        return Object.values(this.windows).reduce((didMinimize, window) => {
            didMinimize = didMinimize || !window.minimized;
            window.minimize();
            return didMinimize;
        }, false);
    }
    closeAll() {
        const closed = Object.keys(this.windows).length != 0;
        Object.values(this.windows).forEach((window) => {
            window.close();
        });
        return closed;
    }
}

const icons = {
    "": "",
    combat: "fa-fist-raised",
    scenes: "fa-map",
    scene: "fa-map",
    actors: "fa-users",
    actor: "fa-users",
    items: "fa-suitcase",
    item: "fa-suitcase",
    weapon: "fa-suitcase",
    journal: "fa-book-open",
    tables: "fa-th-list",
    playlists: "fa-music",
    compendium: "fa-atlas",
    settings: "fa-cogs",
    npc: "fa-skull",
    character: "fa-user",
    spell: "fa-magic",
    equipment: "fa-tshirt",
    feat: "fa-hand-rock",
    class: "fa-user",
    deck: "fa-cards",
};
class WindowMenu extends Application {
    constructor(nav) {
        super({
            template: "modules/mobile-improvements/templates/window-selector.hbs",
            popOut: false,
        });
        this.list = null;
        this.newWindow = (win) => {
            const winIcon = this.winIcon(win.app);
            const windowButton = $(`<button class="window-select" title="${win.title}"><i class="fas ${winIcon}"></i> ${win.title}</button>`);
            const closeButton = $(`<button class="window-close" title="close"><i class="fas fa-times"></i></button>`);
            const row = $(`<li class="window-row"  data-id="${win.id}"></li>`);
            row.append(windowButton, closeButton);
            windowButton.on("click", (ev) => {
                ev.preventDefault();
                win.show();
                this.nav.closeDrawer();
            });
            closeButton.on("click", (ev) => {
                ev.preventDefault();
                win.close();
            });
            return row;
        };
        this.nav = nav;
        Hooks.on("WindowManager:Added", this.windowAdded.bind(this));
        Hooks.on("WindowManager:Removed", this.windowRemoved.bind(this));
    }
    activateListeners(html) {
        this.list = html.find(".window-list");
        for (let w in ui.windows) {
            this.windowAdded.call(this, w);
        }
    }
    // Attempt to discern the title and icon of the window
    winIcon(win) {
        if (win.options?.window?.icon) {
            return win.options?.window?.icon;
        }
        let windowType = win.icon ||
            win.tabName ||
            win.document?.type ||
            win.document?.collectionName ||
            (win.metadata ? "compendium" : "") ||
            "";
        windowType = windowType.toLowerCase();
        const icon = icons[windowType] || windowType;
        return icon;
    }
    windowAdded(appId) {
        this.list?.append(this.newWindow(window.WindowManager.windows[appId]));
        this.update();
    }
    windowRemoved(appId) {
        this.list?.find(`li[data-id="${appId}"]`).remove();
        this.update();
    }
    update() {
        const winCount = Object.values(window.WindowManager.windows).length;
        this.nav.setWindowCount(winCount);
    }
}

class About extends Application {
    constructor() {
        super({
            template: "modules/mobile-improvements/templates/about.hbs",
            id: "mobile-improvements-about",
            title: "MOBILEIMPROVEMENTS.MenuAbout",
            width: 300,
            height: 260,
        });
    }
    activateListeners(html) {
        html.find(".close-about").on("click", (evt) => {
            this.close();
        });
    }
}

class MobileMenu extends Application {
    constructor(nav) {
        super({
            template: "modules/mobile-improvements/templates/menu.hbs",
            popOut: false,
        });
        this.nav = nav;
        this.aboutApp = new About();
    }
    activateListeners(html) {
        html.find("li").on("click", (evt) => {
            const [firstClass] = evt.currentTarget.className.split(" ");
            const [, name] = firstClass.split("-");
            this.selectItem(name);
        });
    }
    toggleOpen() {
        this.element.toggleClass("open");
    }
    selectItem(name) {
        switch (name) {
            case "about":
                this.aboutApp.render(true);
                break;
            case "fullscreen":
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                }
                else {
                    document.documentElement.requestFullscreen();
                }
                break;
            case "players":
                setSetting(settings.SHOW_PLAYER_LIST, !getSetting(settings.SHOW_PLAYER_LIST));
                break;
            case "canvas":
                game.settings.set("core", "noCanvas", !game.settings.get("core", "noCanvas"));
                //@ts-ignore
                SettingsConfig.reloadConfirm();
                break;
            case "exit":
                setSetting(settings.PIN_MOBILE_MODE, false);
                break;
            default:
                console.log("Unhandled menu item", name);
                break;
        }
        this.nav.closeDrawer();
    }
}

var _MobileUI_lastCount;
var ViewState;
(function (ViewState) {
    ViewState[ViewState["Unloaded"] = 0] = "Unloaded";
    ViewState[ViewState["Map"] = 1] = "Map";
    ViewState[ViewState["App"] = 2] = "App";
})(ViewState || (ViewState = {}));
var DrawerState;
(function (DrawerState) {
    DrawerState[DrawerState["None"] = 0] = "None";
    DrawerState["Macros"] = "macros";
    DrawerState["Menu"] = "menu";
    DrawerState["Windows"] = "windows";
})(DrawerState || (DrawerState = {}));
function isTabletMode() {
    return globalThis.MobileMode.enabled && window.innerWidth > 900;
}
class MobileUI extends Application {
    constructor() {
        super({
            template: "modules/mobile-improvements/templates/navigation.hbs",
            popOut: false,
        });
        this.state = ViewState.Unloaded;
        this.drawerState = DrawerState.None;
        this.noCanvas = false;
        _MobileUI_lastCount.set(this, 0);
        this.windowMenu = new WindowMenu(this);
        this.mobileMenu = new MobileMenu(this);
        // Ensure HUD shows on opening a new window
        Hooks.on("WindowManager:WindowRendered", () => this._onShowWindow());
        Hooks.on("WindowManager:BroughtToTop", () => this._onShowWindow());
        Hooks.on("WindowManager:NoneVisible", () => this._onHideAllWindows());
    }
    _onShowWindow() {
        $(document.body).addClass("windows-open");
        if (!globalThis.MobileMode.enabled)
            return;
        this.toggleHud(true);
        if (isTabletMode()) {
            this.showSidebar();
        }
    }
    _onHideAllWindows() {
        $(document.body).removeClass("windows-open");
    }
    render(force, ...arg) {
        this.noCanvas = game.settings.get("core", "noCanvas");
        this.state = this.noCanvas ? ViewState.App : ViewState.Map;
        //@ts-ignore
        const r = super.render(force, ...arg);
        this.windowMenu.render(force);
        this.mobileMenu.render(force);
        return r;
    }
    activateListeners(html) {
        html.find("li").on("click", (evt) => {
            const [firstClass] = evt.currentTarget.className.split(" ");
            const [, name] = firstClass.split("-");
            this.selectItem(name);
        });
        this.updateMode();
        html.before(`<div id="show-mobile-navigation"><i class="fas fa-chevron-up"></i></div>`);
        html.siblings("#show-mobile-navigation").on("click", () => {
            this.toggleHud();
        });
        if (this.noCanvas) {
            this.element.find(".navigation-map").detach();
        }
    }
    expandSidebarWithoutAnimation() {
        //@ts-ignore
        if (!ui.sidebar._collapsed)
            return;
        const sidebar = ui.sidebar.element;
        const tab = sidebar.querySelector(".sidebar-tab.active");
        const tabs = sidebar.querySelector("#sidebar-tabs");
        tabs.dataset.tooltipDirection = "RIGHT";
        const icon = tabs?.querySelector("a.collapse i");
        sidebar.style.height = "";
        sidebar.style.width = "";
        sidebar.classList.remove("collapsed");
        if (tab) {
            tab.style.display = "";
            tab.style.height = "";
        }
        icon?.classList.remove("fa-caret-left");
        icon?.classList.add("fa-caret-right");
        //@ts-ignore
        ui.sidebar._collapsed = false;
        //@ts-ignore
        Hooks.callAll("collapseSidebar", ui.sidebar, ui.sidebar._collapsed);
    }
    collapseSidebarWithoutAnimation() {
        //@ts-ignore
        if (ui.sidebar._collapsed)
            return;
        const sidebar = ui.sidebar.element;
        const tab = sidebar.querySelector(".sidebar-tab.active");
        const tabs = sidebar.querySelector("#sidebar-tabs");
        tabs.dataset.tooltipDirection = "LEFT";
        const icon = tabs?.querySelector("a.collapse i");
        sidebar.style.height = "";
        sidebar.classList.add("collapsed");
        if (tab) {
            tab.style.display = "";
        }
        icon?.classList.remove("fa-caret-right");
        icon?.classList.add("fa-caret-left");
        //@ts-ignore
        ui.sidebar._collapsed = true;
        //@ts-ignore
        Hooks.callAll("collapseSidebar", ui.sidebar, ui.sidebar._collapsed);
    }
    toggleHud(show = false) {
        const isHidden = document.body.classList.contains("hide-hud");
        if (isHidden || show) {
            this.expandSidebarWithoutAnimation();
            $(document.body).removeClass("hide-hud");
        }
        else {
            $(document.body).addClass("hide-hud");
            this.collapseSidebarWithoutAnimation();
        }
    }
    closeDrawer() {
        this.setDrawerState(DrawerState.None);
    }
    showMap() {
        const minimized = window.WindowManager.minimizeAll();
        if (!minimized && this.state == ViewState.Map) {
            this.toggleHud();
        }
        this.state = ViewState.Map;
        canvas.ready && canvas.app?.start();
        this.setDrawerState(DrawerState.None);
        this.updateMode();
    }
    showSidebar() {
        this.state = ViewState.App;
        this.toggleHud(true);
        ui.sidebar?.expand();
        if (!isTabletMode())
            window.WindowManager.minimizeAll();
        if (getSetting(settings.SIDEBAR_PAUSES_RENDER) === true) ;
        this.setDrawerState(DrawerState.None);
        this.updateMode();
    }
    showHotbar() {
        $(document.body).addClass("show-hotbar");
    }
    hideHotbar() {
        $(document.body).removeClass("show-hotbar");
    }
    setWindowCount(count) {
        this.element.find(".navigation-windows .count").html(count.toString());
        if (count === 0) {
            this.element.find(".navigation-windows").addClass("disabled");
        }
        else {
            this.element.find(".navigation-windows").removeClass("disabled");
        }
        if (this.drawerState == DrawerState.Windows &&
            (count === 0 || count > __classPrivateFieldGet(this, _MobileUI_lastCount, "f"))) {
            this.setDrawerState(DrawerState.None);
        }
        __classPrivateFieldSet(this, _MobileUI_lastCount, count, "f");
    }
    setDrawerState(state) {
        $(`body > .drawer`).removeClass("open");
        this.element.find(".toggle.active").removeClass("active");
        this.hideHotbar();
        if (state == DrawerState.None || state == this.drawerState) {
            this.drawerState = DrawerState.None;
            return;
        }
        this.drawerState = state;
        if (state == DrawerState.Macros) {
            this.showHotbar();
        }
        else {
            $(`body > .drawer.drawer-${state}`).addClass("open");
        }
        this.element.find(`.navigation-${state}`).addClass("active");
    }
    selectItem(name) {
        switch (name) {
            case "map":
                this.showMap();
                break;
            case "sidebar":
                this.showSidebar();
                break;
            default:
                this.setDrawerState(name);
        }
    }
    updateMode() {
        if (globalThis.MobileMode.enabled) {
            this.element.find(".active:not(.toggle)").removeClass("active");
            $(document.body).removeClass("mobile-app");
            $(document.body).removeClass("mobile-map");
            switch (this.state) {
                case ViewState.Map:
                    this.element.find(".navigation-map").addClass("active");
                    $(document.body).addClass("mobile-map");
                    this.collapseSidebarWithoutAnimation();
                    break;
                case ViewState.App:
                    this.element.find(".navigation-sidebar").addClass("active");
                    $(document.body).addClass("mobile-app");
                    this.expandSidebarWithoutAnimation();
                    break;
            }
        }
        else {
            this.expandSidebarWithoutAnimation();
        }
    }
}
_MobileUI_lastCount = new WeakMap();

class TouchInput {
    constructor() {
        this.cancelled = false;
        this.tapMaxTime = 400;
        this.tapStart = -1;
        this.tapStartPos = { x: 0, y: 0 };
        this.touches = 0;
    }
    getTarget(evt) {
        let target = evt.target;
        while (!target?.document && target?.parent) {
            target = target.parent;
        }
        if (!target.document) {
            return null;
        }
        return target;
    }
    hook() {
        if (!canvas.ready)
            return;
        canvas.stage?.on("touchstart", (evt) => {
            this.touches++;
            this.tapStart = Date.now();
            this.tapStartPos = evt.client;
            if (this.touches > 1) {
                this.cancelled = true;
            }
        });
        canvas.stage?.on("touchmove", (evt) => {
            if (evt.client.x != this.tapStartPos.x ||
                evt.client.y != this.tapStartPos.y) {
                this.cancelled = true;
            }
        });
        canvas.stage?.on("touchend", (evt) => {
            if (this.touches > 0)
                this.touches--;
            if (!this.cancelled && Date.now() - this.tapStart < this.tapMaxTime) {
                const target = this.getTarget(evt);
                if (!target) {
                    globalThis.MobileMode.navigation.toggleHud();
                }
            }
            this.cancelled = false;
        });
        console.log("Mobile Improvements | Touch tap hooked");
    }
}

function initChatEffects() {
    const windowHtml = `<div id="mobile-chat-bubbles"></div>`;
    document.body.insertAdjacentHTML("beforeend", windowHtml);
    const bubbleWindow = document.getElementById("mobile-chat-bubbles");
    Hooks.on("createChatMessage", (newMessage) => {
        if (!globalThis.MobileMode.enabled ||
            !newMessage.isRoll ||
            !newMessage.isAuthor) {
            return;
        }
        if (getSetting(settings.SHOW_CHAT_ON_ROLL)) {
            const shouldBloop = globalThis.MobileMode.navigation.state === ViewState.Map ||
                window.WindowManager.minimizeAll() ||
                ui.sidebar.activeTab !== "chat";
            globalThis.MobileMode.navigation.showSidebar();
            ui.sidebar.activateTab("chat");
            if (shouldBloop) {
                Hooks.once("renderChatMessageHTML", (obj, html) => {
                    if (obj.id !== newMessage.id)
                        return; // Avoid possible race condition?
                    html.classList.add("bloop");
                    setTimeout(() => html.classList.remove("bloop"), 10000);
                });
            }
        }
        if (getSetting(settings.SHOW_ROLL_BUBBLES)) {
            Hooks.once("renderChatMessageHTML", async (message, html, data) => {
                if (newMessage.id !== message.id)
                    return; // Avoid possible race condition?
                if (html.classList.contains("dsn-hide")) {
                    await new Promise((resolve) => {
                        Hooks.once("diceSoNiceRollComplete", () => {
                            resolve();
                        });
                    });
                }
                const flavor = data.message.flavor
                    ? `<div class="flavor">${data.message.flavor}</div>`
                    : "";
                const bubbleHtml = `<div class="mi-chat-bubble">${flavor}${data.message.content}</div>`;
                bubbleWindow.insertAdjacentHTML("beforeend", bubbleHtml);
                const bubble = bubbleWindow.lastElementChild;
                bubble.addEventListener("click", () => bubble.remove());
                // Demonlord fix
                if (game.user?.isGM) {
                    bubble.querySelectorAll(".gmremove").forEach((el) => el.remove());
                }
                else {
                    bubble.querySelectorAll(".gmonlyzero").forEach((el) => el.remove());
                }
                setTimeout(() => bubble.remove(), 15000);
            });
        }
    });
}

function setMeta(maxScale = "1.0") {
    const meta = document.querySelector(`meta[name="viewport"]`);
    if (meta) {
        meta.setAttribute("content", `width=device-width, initial-scale=1.0, maximum-scale=${maxScale}, user-scalable=1, interactive-widget=resizes-content`);
    }
}
class MobileMode {
    static updateCompatibilityClasses() {
        MobileMode.compatibilityClasses.forEach((c) => {
            document.body.classList.toggle(c, MobileMode.enabled);
        });
    }
    static enter() {
        if (MobileMode.enabled)
            return;
        MobileMode.enabled = true;
        document.body.classList.add("mobile-improvements");
        MobileMode.navigation?.updateMode();
        MobileMode.updateCompatibilityClasses();
        setMeta();
        ui.nav?.collapse();
        Hooks.call("mobile-improvements:enter");
    }
    static leave() {
        if (!MobileMode.enabled)
            return;
        MobileMode.enabled = false;
        document.body.classList.remove("mobile-improvements");
        MobileMode.navigation.updateMode();
        MobileMode.updateCompatibilityClasses();
        Hooks.call("mobile-improvements:leave");
    }
    static viewResize() {
        if (game.settings && getSetting(settings.PIN_MOBILE_MODE))
            return MobileMode.enter();
        if (localStorage.getItem("mobile-improvements.pinMobileMode") === "true")
            return MobileMode.enter();
        if (window.innerWidth <= 800) {
            MobileMode.enter();
        }
        else {
            MobileMode.leave();
        }
    }
}
MobileMode.enabled = false;
MobileMode.compatibilityClasses = [];
document.body.addEventListener("scroll", () => {
    document.body.scroll(0, 0);
});
function togglePlayerList(show) {
    if (show) {
        document.getElementById("players")?.classList.add("mobile-hidden");
    }
    else {
        document.getElementById("players")?.classList.remove("mobile-hidden");
    }
}
function showToggleModeButton(show) {
    if (!show) {
        $("#mobile-improvements-toggle").detach();
        return;
    }
    const button = $("<button>")
        .attr("id", "mobile-improvements-toggle")
        .attr("type", "button")
        .attr("data-tooltip", game.i18n.localize("MOBILEIMPROVEMENTS.EnableMobileMode"))
        .attr("data-tooltip-direction", "LEFT")
        .addClass("ui-control icon fa-solid fa-mobile-alt");
    $("#hotbar").prepend(button);
    button.on("click", () => {
        setSetting(settings.PIN_MOBILE_MODE, true);
    });
}
// Trigger the recalculation of viewheight often. Not great performance,
// but required to work on different mobile browsers
document.addEventListener("fullscreenchange", () => setTimeout(MobileMode.viewResize, 100));
window.addEventListener("resize", MobileMode.viewResize);
window.addEventListener("scroll", MobileMode.viewResize);
MobileMode.viewResize();
Hooks.once("init", async function () {
    console.log("Mobile Improvements | Initializing Mobile Improvements");
    activate();
    if (MobileMode.navigation === undefined) {
        MobileMode.navigation = new MobileUI();
    }
    registerSettings({
        [settings.SHOW_PLAYER_LIST]: togglePlayerList,
        [settings.SHOW_MOBILE_TOGGLE]: showToggleModeButton,
        [settings.PIN_MOBILE_MODE]: (enabled) => {
            if (enabled)
                MobileMode.enter();
            else
                MobileMode.leave();
        },
    });
    await preloadTemplates();
});
Hooks.on("drawPrimaryCanvasGroup", () => {
    const sceneBackgroundTexture = 
    //@ts-ignore
    canvas.app?.stage.rendered.environment.primary.background.texture;
    const textureSize = {
        width: sceneBackgroundTexture.width,
        height: sceneBackgroundTexture.height,
    };
    const maxTextureSize = canvas.app?.renderer.gl.getParameter(canvas.app?.renderer.gl.MAX_TEXTURE_SIZE);
    if (maxTextureSize &&
        Math.max(textureSize.width, textureSize.height) > maxTextureSize) {
        ui.notifications.error(game.i18n.format("MOBILEIMPROVEMENTS.MaxTextureSizeExceeded", {
            width: textureSize.width,
            height: textureSize.height,
            maxTextureSize,
        }));
    }
});
Hooks.on("ready", () => {
    supressNotifications();
    // Compatibility with Window Controls
    if (game.modules?.get("window-controls")?.active) {
        MobileMode.compatibilityClasses.push("mi-window-controls");
        const organizedMinimize = game.settings.get("window-controls", "organizedMinimize");
        if (organizedMinimize == "persistentTop") {
            MobileMode.compatibilityClasses.push("mi-window-controls-persistent", "mi-window-controls-persistent-top");
        }
        else if (organizedMinimize == "persistentBottom") {
            MobileMode.compatibilityClasses.push("mi-window-controls-persistent", "mi-window-controls-persistent-bottom");
        }
        MobileMode.updateCompatibilityClasses();
    }
    MobileMode.navigation.render(true);
    initChatEffects();
    showToggleModeButton(getSetting(settings.SHOW_MOBILE_TOGGLE));
});
Hooks.once("renderChatLog", (app) => {
    if (!app.element) {
        return;
    }
    let touchWhenFocused = false;
    const form = app.element.querySelector(".chat-form");
    const textarea = form?.querySelector("#chat-message");
    const controls = form.querySelector(".chat-controls");
    const btn = document.createElement("button");
    btn.id = "chat-form--send";
    btn.className = "ui-control";
    btn.innerHTML = `<i class="fas fa-paper-plane"></i>`;
    btn.addEventListener("touchstart", () => {
        if (document.activeElement === textarea) {
            touchWhenFocused = true;
        }
    });
    btn.addEventListener("touchend", () => {
        setTimeout(() => (touchWhenFocused = false), 100);
    });
    btn.addEventListener("click", (evt) => {
        evt.preventDefault();
        if (touchWhenFocused) {
            textarea?.focus();
        }
        console.log(app);
        //@ts-ignore
        app._onKeyDown({
            key: "Enter",
            target: textarea,
            preventDefault: () => { },
            stopPropagation: () => { },
            currentTarget: textarea,
        });
    });
    controls?.append(btn);
});
Hooks.once("renderSceneNavigation", () => {
    if (MobileMode.enabled)
        ui.nav?.collapse();
});
Hooks.once("renderPlayerList", () => togglePlayerList(getSetting(settings.SHOW_PLAYER_LIST)));
Hooks.on("getApplicationHeaderButtons", addWindowZoomControlButton);
Hooks.on("getActorSheetHeaderButtons", addWindowZoomControlButton);
Hooks.on("getHeaderControlsApplicationV2", addWindowZoomControlButton);
function addWindowZoomControlButton(app, buttons) {
    if (MobileMode.enabled) {
        buttons.unshift({
            class: "zoom",
            label: "MOBILEIMPROVEMENTS.ZoomOut",
            icon: "fa-solid fa-magnifying-glass-minus",
            onclick: () => createZoomControl(app),
            onClick: () => createZoomControl(app),
        });
    }
}
function createZoomControl(app) {
    const html = $(app.element);
    const currentZoom = getComputedStyle(html.get(0)).getPropertyValue("--zoomValue");
    if (html.find(".window-zoom-slider").length > 0) {
        html.find(".window-zoom-slider").remove();
    }
    else {
        const zoomTool = $("<div>")
            .addClass("flexrow window-zoom-slider")
            .insertAfter(html.find(".window-header"));
        $("<input>")
            .attr("type", "range")
            .attr("min", 0.5)
            .attr("max", 1)
            .attr("step", 0.1)
            .val(currentZoom)
            .on("input", function () {
            const newZoomValue = $(this).val();
            html.get(0).style.setProperty("--zoomValue", newZoomValue);
            setMeta(newZoomValue < 1 ? "2.0" : "1.0");
        })
            .on("change", function () {
            const orderedClasses = [...html.get(0).classList]
                .filter((c) => !["app", "window-app", "application", "wm-managed"].includes(c))
                .sort()
                .join(" ");
            setSetting(settings.WINDOWS_ZOOM_VALUES, foundry.utils.mergeObject(getSetting(settings.WINDOWS_ZOOM_VALUES), { [orderedClasses]: $(this).val() }));
        })
            .appendTo(zoomTool);
        $("<i>")
            .addClass("toggle fas fa-caret-up")
            .on("click", function () {
            $(this).closest(".window-zoom-slider").remove();
        })
            .appendTo(zoomTool);
    }
}
Hooks.on("renderFormApplication", setWindowZoomValueFromStorage);
Hooks.on("renderActorSheet", setWindowZoomValueFromStorage);
Hooks.on("renderApplicationV2", setWindowZoomValueFromStorage);
Hooks.on("renderSettingsConfig", (app, html) => {
    if (!MobileMode.enabled) {
        return;
    }
    const sidebar = html.querySelector(`aside[data-application-part="sidebar"]`);
    const toggle = document.createElement("div");
    toggle.className = "sidebar-toggle";
    toggle.innerHTML = `<i class="fas fa-caret-left"></i>`;
    sidebar?.insertAdjacentElement("afterend", toggle);
    toggle.addEventListener("click", () => {
        const visible = sidebar.style.display !== "none";
        const icon = toggle.firstElementChild;
        if (visible) {
            icon.classList.remove("fa-caret-left");
            icon.classList.add("fa-caret-right");
            sidebar.style.display = "none";
        }
        else {
            icon.classList.remove("fa-caret-right");
            icon.classList.add("fa-caret-left");
            sidebar.style.display = "";
        }
    });
});
Hooks.on("WindowManager:Maximized", onMainWindowChanged);
Hooks.on("WindowManager:Minimized", onMainWindowChanged);
Hooks.on("WindowManager:Removed", onMainWindowChanged);
function setMetaForWindow(html) {
    if (MobileMode.enabled && html) {
        const elem = "get" in html ? html.get(0) : html;
        const isZoomed = elem &&
            parseFloat(getComputedStyle(elem).getPropertyValue("--zoomValue")) < 1;
        setMeta(isZoomed ? "2.0" : "1.0");
    }
}
function onMainWindowChanged() {
    if (MobileMode.enabled) {
        const currentWindow = Object.values(getManager().windows).find((w) => !w.minimized);
        if (currentWindow) {
            setMetaForWindow(currentWindow.app.element);
        }
        else {
            setMeta("1.0");
        }
    }
}
function setWindowZoomValueFromStorage(app, html) {
    const elem = "get" in html ? html.get(0) : html;
    if (MobileMode.enabled) {
        const settingObjectValue = getSetting(settings.WINDOWS_ZOOM_VALUES);
        const orderedClasses = [...elem.classList]
            .filter((c) => !["app", "window-app", "application", "wm-managed"].includes(c))
            .sort()
            .join(" ");
        elem
            .style.setProperty("--zoomValue", settingObjectValue[orderedClasses] || 1);
    }
}
function supressNotifications() {
    window.libWrapper.register("mobile-improvements", "ui.notifications.notify", function (wrapped, ...args) {
        if ([
            "ERROR.LowResolution",
            "ERROR.RESOLUTION.Window",
            "ERROR.RESOLUTION.Screen",
            "ERROR.RESOLUTION.Scale",
        ].includes(args[0])) {
            console.info("notification suppressed", args);
            return;
        }
        return wrapped(...args);
    });
}
const touchInput = new TouchInput();
Hooks.on("canvasReady", () => touchInput.hook());
globalThis.MobileMode = MobileMode;
//# sourceMappingURL=mobile-improvements.js.map
