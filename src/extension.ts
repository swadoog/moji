import * as VSCode from 'vscode';

/**
 * @param {VSCode.ExtensionContext} context
 */
export function activate(context: VSCode.ExtensionContext) {
    console.log('Activated extension');

    const configuration = VSCode.workspace.getConfiguration('radix');
    console.log('Loaded configuration:', configuration);

    let disposable = VSCode.commands.registerCommand("radix.startup", () => {
        const panel = VSCode.window.createWebviewPanel(
            "radix",
            "Alpha",
            VSCode.ViewColumn.One,
            { enableScripts: true }
        );

        const onDiskPath = VSCode.Uri.file(
            VSCode.Uri.joinPath(context.extensionUri, 'src', 'images', 'ascii_image.png').fsPath
        );
        const imgSrc = panel.webview.asWebviewUri(onDiskPath);

        panel.webview.html = getWebviewContent(imgSrc as unknown as string);

        panel.webview.onDidReceiveMessage(
            message => {
                if (message.command === 'alert') {
                    VSCode.window.showInformationMessage(message.text);
                }
            },
            undefined,
            context.subscriptions
        );
    });

    VSCode.commands.executeCommand("radix.startup");
    context.subscriptions.push(disposable);
}

// function radixStartup() {
    
// }

export function deactivate() {
  // todo: check if this is the correct impl
  const outputChannel = VSCode.window.createOutputChannel("Radix");
  outputChannel.appendLine("Deactivated extension");
  outputChannel.show();
}

function getWebviewContent(imgSrc: string) {
    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hello World</title>
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
        <img src="${imgSrc}" alt="ASCII Image" id="asciiImage">
        <button id="clickMe">Click me</button>
        <script>
          const vscode = acquireVsCodeApi();
          
          document.getElementById('asciiImage').addEventListener('click', () => {
            vscode.postMessage({ command: 'alert', text: 'You clicked the image!' });
          });

          document.addEventListener('keydown', event => {
            if (event.key === 'h') {
              vscode.postMessage({ command: 'alert', text: 'You pressed the "h" key!' });
            }
          });

          document.getElementById('clickMe').addEventListener('click', () => {
            vscode.postMessage({ command: 'alert', text: 'You clicked the button!' });
          });
        </script>
      </body>
    </html>
  `;
}
