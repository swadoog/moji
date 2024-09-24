import * as VSCode from "vscode";
import * as fs from 'fs';
import * as path from 'path';

type nil = undefined;

type MojiCommand = {
    key: string;
    title: string;
    exe: string;
}

type VSCodeKeybinding = {
    key: string;
    command: string;
    when?: string;
    args?: {
        commands: { command: string, args?: any }[];
    }
}

type KBConfig = {
    getKeybindings: () => VSCodeKeybinding[];
    setKeybindings: (keybindings: VSCodeKeybinding[]) => void;
}

const
    MOJI    = "moji",
    DEBUG   = true,
    DEBUG_S = "moji>",
    
    DEFAULT_COCKPIT_IMAGE = "kanagawa.jpg",
    IMAGES_LOCATION       = "src/images",

    MOJI_IMAGE    = "image",
    MOJI_HEADER   = "header",
    MOJI_ENABLE   = "enable",
    MOJI_COMMANDS = "commands",
    MOJI_FONT     = "font",

    MOJI_WHEN = "activeWebviewPanelId == 'moji'"
;

export function activate(context: VSCode.ExtensionContext): number {
    const configuration = VSCode.workspace.getConfiguration(MOJI);
    LOG("Loaded configuration:", configuration);
    validateConfig(configuration);

    if (!configuration.get("enable")) {
        LOG("Extension disabled; exiting.");
        return 1;
    }

    context.subscriptions.push(
        VSCode.commands.registerCommand("moji.startup", () =>
            mojiStartup(context)
        ),
        VSCode.commands.registerCommand("moji.toggle", () =>
            mojiToggle(configuration)
        ),
    );

    configureKeybindings(context);
    if (!anyTextEditorOpen()) VSCode.commands.executeCommand("moji.startup");

    return 0;
}

export function deactivate(): number {
    // todo: check if this is the correct impl
    const outputChannel = VSCode.window.createOutputChannel(MOJI);
    outputChannel.appendLine("Deactivated extension.");
    outputChannel.show();
    return 0;
}

// MARK: ext commands

function mojiStartup(context: VSCode.ExtensionContext): VSCode.WebviewPanel {
    TODO("Move webview panel creation to activate function.");

    const panel = VSCode.window.createWebviewPanel(
        MOJI, MOJI, VSCode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: true }
    );

    let imgSrc = getExtSetting(MOJI_IMAGE);
    let imgUri: string | nil;
    if (imgSrc == DEFAULT_COCKPIT_IMAGE) {
        imgSrc = context.asAbsolutePath(`${IMAGES_LOCATION}/${DEFAULT_COCKPIT_IMAGE}`);
    }
    if (imgSrc) {
        const onDiskPath = VSCode.Uri.file(imgSrc);
        imgUri = panel.webview.asWebviewUri(onDiskPath).toString();
    }
    
    panel.webview.html = configureMojiHTML(context, panel, imgUri);
    panel.onDidChangeViewState(
        e => { if (!e.webviewPanel.active) panel.dispose() },
        null, context.subscriptions
    );

    return panel;
}

function mojiToggle(configuration: VSCode.WorkspaceConfiguration): void {
    configuration.update(MOJI_ENABLE, !configuration.get(MOJI_ENABLE), true);
}

// MARK: util

function validateConfig(config: VSCode.WorkspaceConfiguration): void {
    const
        image    = config.get(MOJI_IMAGE),
        header   = config.get(MOJI_HEADER),
        commands = config.get<MojiCommand[]>(MOJI_COMMANDS)
    ;

    if (image && typeof image !== "string") {
        throw new Error(`Expected ${MOJI_IMAGE} to be a string, but got ${typeof image}`);
    }

    if (header && typeof header !== "string") {
        throw new Error(`Expected ${MOJI_HEADER} to be a string, but got ${typeof header}`);
    }

    if (commands && !Array.isArray(commands)) {
        throw new Error(`Expected ${MOJI_COMMANDS} to be an array, but got ${typeof commands}`);
    }
}

function LOG(...args: any[]): void {
    const callerName = (new Error().stack?.split('\n')[2].trim().split(' ')[1]) || "unknown";
    if (DEBUG) console.log(`${MOJI}(${callerName})>`, ...args);
}

function TODO(...args: any[]): void {
    const callerName = (new Error().stack?.split('\n')[2].trim().split(' ')[1]) || "unknown";
    console.warn(`${DEBUG_S}todo(${callerName})>`, ...args);
}

function anyTextEditorOpen(): boolean {
    return VSCode.window.visibleTextEditors.some(editor => editor.viewColumn !== undefined);
}

function getExtSetting<T = string>(key: string): T | nil {
    return VSCode.workspace.getConfiguration(MOJI).get<T>(key);
}

function setupUserStyles() {
    throw "todo: load user fonts/colors";
}

// MARK: keybindings

function configureKeybindings(context: VSCode.ExtensionContext): void {
    TODO("Add support for cleanup of no longer used keybindings.");
    TODO("Add support for more complex keybinding configurations.");

    const commands = getExtSetting<MojiCommand[]>(MOJI_COMMANDS);
    const kbconfig = KBConfig();
    let keybindings: VSCodeKeybinding[] = [];

    if (!kbconfig) return LOG("Error loading keybindings; skipping keybinding setup.");
    if (!commands || commands.length === 0) return LOG("No custom commands found; skipping keybinding setup.");
    keybindings = kbconfig.getKeybindings();

    for (const command of commands) {
        const existing = keybindings.find(cmd =>
            cmd.when === MOJI_WHEN
            && cmd.key === command.key
            && cmd.args?.commands[0].command === command.exe
        );

        if (existing) {
            LOG(`Keybinding for ${command.key} already exists; skipping.`);
            continue;
        }

        keybindings.push({
            key: command.key,
            when: `activeWebviewPanelId == '${MOJI}'`,
            command: command.exe,
        });
    }

    kbconfig.setKeybindings(keybindings);
    LOG("Keybindings successfully configured.");
}

function KBConfig(): KBConfig | nil {
    let keybindingsPath: string;
    let keybindings: VSCodeKeybinding[] = [];

    if (process.platform === "win32") {
        keybindingsPath = path.join(process.env.APPDATA as string, "Code/User/keybindings.json");
    } else if (process.platform === "darwin") {
        keybindingsPath = path.join(process.env.HOME as string, "Library/Application Support/Code/User/keybindings.json");
    } else {
        keybindingsPath = path.join(process.env.HOME as string, ".config/Code/User/keybindings.json");
    }

    if (fs.existsSync(keybindingsPath)) {
        const keybindingsContent = fs.readFileSync(keybindingsPath, 'utf-8');
        try {
            keybindings = JSON.parse(keybindingsContent.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''))
        } catch (e) {
            LOG("Error parsing keybindings file:", e);
            return undefined;
        }
    } else {
        LOG("No keybindings file found; creating new one.");
        fs.writeFileSync(keybindingsPath, "[]");
    }

    return {
        getKeybindings: () => keybindings,
        setKeybindings: (newKeybindings) => {
            fs.writeFileSync(keybindingsPath, JSON.stringify(newKeybindings, null, 2));
        }
    };
}

// MARK: html

function configureCustomCommandsHTML(commands: MojiCommand[]): string {
    // todo: add icon support
    let commandsHTML = "";

    const containerStyle = `
        display: flex; justify-content: center; align-items: center; flex-direction: column; width: 100%;
        padding-top: 5px; padding-bottom: 5px;
        margin-top: 15px;
        gap: 15px;
    `;

    const commandStyle = `
        display: flex; justify-content: space-between; width: 34%;
    `;

    const keyStyle = `
        color: #ffdd33;
    `;

    commandsHTML += /*html*/`<div style="${containerStyle}">`;
    for (const command of commands) {
        commandsHTML += /*html*/`
            <span style="${commandStyle}">
                <span>${command.title}</span>
                <span style="${keyStyle}">${command.key}</span>
            </span>
        `;
    }
    commandsHTML += /*html*/`</div>`;

    return commandsHTML;
}

function configureMojiHTML(context: VSCode.ExtensionContext, panel: VSCode.WebviewPanel, imgSrc?: string): string {
    let
        header       = getExtSetting(MOJI_HEADER),
        commands     = getExtSetting<MojiCommand[]>(MOJI_COMMANDS),
        font         = getExtSetting(MOJI_FONT),
        headerHTML   = "",
        imageHTML    = "",
        commandsHTML = ""
    ;

    if (header) headerHTML = `<h1>${header}</h1>`;
    if (imgSrc) imageHTML  = `<img src="${imgSrc}" alt="ASCII Image" id="asciiImage" />`;
    if (commands) commandsHTML = configureCustomCommandsHTML(commands);
    
    return /*html*/`
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>moji</title>
            <style>
                body {
                    display:          flex;
                    flex-direction:   column;
                    justify-content:  center;
                    align-items:      center;
                    height:           100vh;
                    margin:           0;
                    background-color: #181818;
                    color:            #fff;
                    font-family:      ${font};
                    white-space:      pre;
                    gap:              10px;
                }
                img {
                    max-height: 50%;
                    max-width:  70%;
                }
                h1 {
                    margin-top:    0;
                    margin-bottom: 0;
                }
            </style>
        </head>
        <body>
            ${headerHTML}
            ${imageHTML}
            ${commandsHTML}
            <script>
                const vscode = acquireVsCodeApi();
                const state = vscode.getState();

                window.addEventListener("message", (event) => {
                    const message = event.data;
                });

                document.addEventListener("keydown", (event) => {
                    if (event.key === "h") {
                        vscode.postMessage({
                            command: "alert",
                            text: 'moji: Help command not yet implemented.',
                        });
                    }
                });
            </script>
        </body>
    </html>
    `;
}