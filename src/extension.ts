import * as VSCode from "vscode";

type nil = undefined;

type MojiCustomCommand = {
    key: string;
    title: string;
    command: string;
}

const
    MOJI    = "moji",
    DEBUG   = true,
    DEBUG_S = "moji>",
    
    DEFAULT_CONFIG_LOCATION = ".config/moji",
    DEFAULT_COCKPIT_IMAGE   = "kanagawa.jpg",
    IMAGES_LOCATION         = "src/images",

    MOJI_IMAGE           = "image",
    MOJI_HEADER          = "header",
    MOJI_ENABLE          = "enable",
    MOJI_CUSTOM_COMMANDS = "commands"
;

export function activate(context: VSCode.ExtensionContext): number {
    const configuration = VSCode.workspace.getConfiguration(MOJI);
    mojiLog("Loaded configuration:", configuration);
    validateConfig(configuration);

    if (!configuration.get("enable")) {
        mojiLog("Extension disabled; exiting.");
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

// MARK: commands

function mojiStartup(context: VSCode.ExtensionContext): void {
    const panel = VSCode.window.createWebviewPanel(
        MOJI, MOJI, VSCode.ViewColumn.One, { enableScripts: true }
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
    panel.webview.onDidReceiveMessage(
        (message) => {
            if (message.command === "alert") {
                VSCode.window.showInformationMessage(message.text);
            }
        },
        undefined,
        context.subscriptions
    );
}

function mojiToggle(configuration: VSCode.WorkspaceConfiguration): void {
    configuration.update(MOJI_ENABLE, !configuration.get(MOJI_ENABLE), true);
}

function validateConfig(config: VSCode.WorkspaceConfiguration): void {
    const
        image    = config.get(MOJI_IMAGE),
        header   = config.get(MOJI_HEADER),
        commands = config.get<MojiCustomCommand[]>(MOJI_CUSTOM_COMMANDS)
    ;

    if (image && typeof image !== "string") {
        throw new Error(`Expected ${MOJI_IMAGE} to be a string, but got ${typeof image}`);
    }

    if (header && typeof header !== "string") {
        throw new Error(`Expected ${MOJI_HEADER} to be a string, but got ${typeof header}`);
    }

    if (commands && !Array.isArray(commands)) {
        throw new Error(`Expected ${MOJI_CUSTOM_COMMANDS} to be an array, but got ${typeof commands}`);
    }
}

// MARK: util

function mojiLog(...args: any[]): void {
    if (DEBUG) console.log(DEBUG_S, ...args);
}

function anyTextEditorOpen(): boolean {
    return VSCode.window.visibleTextEditors.some(editor => editor.viewColumn !== undefined);
}

function getExtSetting<T = string>(key: string): T | nil {
    return VSCode.workspace.getConfiguration(MOJI).get<T>(key);
}

function setupCustomCommandListeners(context: VSCode.ExtensionContext): void {
    throw "todo: setupCustomCommandListeners";
}

function setupUserStyles() {
    throw "todo: load user fonts/colors";
}

// MARK: html

function configureCustomCommandsHTML(commands: MojiCustomCommand[]): string {
    // todo: add icon support
    let commandsHTML = "";

    const containerStyle = `
        display: flex; justify-content: center; align-items: center; flex-direction: column; width: 100%;
        padding-top: 5px; padding-bottom: 5px;
        margin-top: 15px;
        gap: 15px;
    `;

    const commandStyle = `
        display: flex; justify-content: space-between; width: 40%;
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
        commands     = getExtSetting<MojiCustomCommand[]>(MOJI_CUSTOM_COMMANDS),
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
                    font-family:      monospace;
                    white-space:      pre;
                    gap:              10px;
                }
                img {
                    
                    max-height:    50%;
                    max-width:     70%;
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
