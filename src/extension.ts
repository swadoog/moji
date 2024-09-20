import * as VSCode from "vscode";
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_COCKPIT_IMAGE = "asuka.png";

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

    const onDiskPath = VSCode.Uri.file(
        VSCode.Uri.joinPath(
            context.extensionUri,
            "src",
            "images",
            VSCode.workspace.getConfiguration("radix").get("cockpitImage") || DEFAULT_COCKPIT_IMAGE
        ).fsPath
    );
    const imgSrc = panel.webview.asWebviewUri(onDiskPath);
    panel.webview.html = getWebviewContent(context, panel, imgSrc.toString());

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

function getHtmlFileContent(context: VSCode.ExtensionContext): string {
    const htmlFilePath = path.join(context.extensionPath, 'src', 'radix.html');
    return fs.readFileSync(htmlFilePath, 'utf8');
}

function getWebviewContent(context: VSCode.ExtensionContext, panel: VSCode.WebviewPanel, imgSrc: string): string {
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
            <h1>Hello World</h1>
            <img src="${imgSrc}" alt="ASCII Image" id="asciiImage" />
            <button id="clickMe">Click me</button>
            <script>
                const vscode = acquireVsCodeApi();
                const state = vscode.getState();

                window.addEventListener("message", (event) => {
                    const message = event.data;
                });

                document.getElementById("asciiImage").addEventListener("click", () => {
                    vscode.postMessage({
                        command: "alert",
                        text: "You clicked the image!",
                    });
                });

                document.addEventListener("keydown", (event) => {
                    if (event.key === "h") {
                        vscode.postMessage({
                            command: "alert",
                            text: 'You pressed the "h" key!',
                        });
                    }
                });

                document.getElementById("clickMe").addEventListener("click", () => {
                    vscode.postMessage({
                        command: "alert",
                        text: "You clicked the button!",
                    });
                });
            </script>
        </body>
    </html>
    `;
}
