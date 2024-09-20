import * as VSCode from "vscode";

type nil = undefined;

const
    DEFAULT_CONFIG_LOCATION = ".config/radix",
    DEFAULT_COCKPIT_IMAGE   = "kanagawa.png"
;

export function activate(context: VSCode.ExtensionContext): number {
    const configuration = VSCode.workspace.getConfiguration("radix");
    console.log("Loaded configuration:", configuration);

    if (!configuration.get("enable")) {
        console.log("Extension disabled; exiting.");
        return 1;
    }

    const commandRegisters = [
        VSCode.commands.registerCommand("radix.startup", () =>
            radixStartup(context)
        ),
        VSCode.commands.registerCommand("radix.toggle", () =>
            radixToggle(configuration)
        ),
    ];
    context.subscriptions.push(...commandRegisters);

    if (!anyTextEditorOpen()) VSCode.commands.executeCommand("radix.startup");

    return 0;
}

export function deactivate(): number {
    // todo: check if this is the correct impl
    const outputChannel = VSCode.window.createOutputChannel("Radix");
    outputChannel.appendLine("Deactivated extension.");
    outputChannel.show();
    return 0;
}

function radixStartup(context: VSCode.ExtensionContext): void {
    const panel = VSCode.window.createWebviewPanel(
        "radix",
        "Alpha",
        VSCode.ViewColumn.One,
        { enableScripts: true }
    );

    let imgSrc = getSetting("cockpitImage");
    let imgUri: string | nil;
    if (imgSrc) {
        const onDiskPath = VSCode.Uri.file(imgSrc);
        imgUri = panel.webview.asWebviewUri(onDiskPath).toString();
    }
    
    panel.webview.html = getWebviewContent(context, panel, imgUri);
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

function radixToggle(configuration: VSCode.WorkspaceConfiguration): void {
    configuration.update("enable", !configuration.get("enable"), true);
}

function anyTextEditorOpen(): boolean {
    return VSCode.window.visibleTextEditors.some(
        (editor) => editor.viewColumn !== undefined
    );
}

function getSetting<T = string>(key: string): T | nil {
    return VSCode.workspace.getConfiguration("radix").get<T>(key);
}

function getWebviewContent(context: VSCode.ExtensionContext, panel: VSCode.WebviewPanel, imgSrc?: string): string {
    let header     = getSetting("header");
    let imageHTML  = "";
    let headerHTML = "";

    if (imgSrc) imageHTML  = `<img src="${imgSrc}" alt="ASCII Image" id="asciiImage" />`;
    if (header) headerHTML = `<h1>${header}</h1>`;

    return /*html*/`
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Radix</title>
            <style>
                body {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #000;
                    color: #fff;
                    font-family: monospace;
                    white-space: pre;
                }
                img {
                    margin-top: 20px;
                    max-height: 50%;
                    max-width: 70%;
                }
            </style>
        </head>
        <body>
            ${headerHTML}
            ${imageHTML}
            <p>Press <kbd>h</kbd> for help.</p>
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
                            text: 'Radix: Help command not yet implemented.',
                        });
                    }
                });
            </script>
        </body>
    </html>
    `;
}
