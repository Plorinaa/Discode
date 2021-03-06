const vscode = require('vscode');
const discord = require('discord.js');

let discodeLog = vscode.window.createOutputChannel("Discode");

let config = vscode.workspace.getConfiguration('discode');
let token = config.get("token");
let logOrNotification = config.get("logOrNotification");
let enabled = config.get("enabled");

let statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
statusBar.text = "Not Connected";
statusBar.tooltip = "Status of Discode.";
statusBar.show();

let client;

function setStatus(message, showNotification = true) {
	statusBar.text = message;
	discodeLog.appendLine(message);
	if (showNotification) vscode.window.showInformationMessage(message);
}

function activate(context) {
	let sendMessage = vscode.commands.registerCommand('discode.sendMessage', () => {
		var canContinue = true;
		var channels = client.channels.filter(ch => ch.type === 'dm' || ch.type === 'group').array();
		var channelNames = {};

		channels.forEach((channel, index) => {
			channelNames[channel.type === 'dm' ? channel.recipient.username : channel.name === null ? "Unnamed group" : channel.name] = channel;
		});

		let userSelection = "";
		let message = "";

		vscode.window.showQuickPick(Object.keys(channelNames), {
			ignoreFocusOut: true,
			placeHolder: "Which user do you want to text with?"
		}).then((val) => {
			if (val === undefined) canContinue = false;
			userSelection = val;

			if (!canContinue) return;

			vscode.window.showInputBox({
				ignoreFocusOut: true,
				placeHolder: "Message to send."
			}).then((value) => {
				if (value === undefined) canContinue = false;
				message = value;

				if (!canContinue) return;

				let channel = channelNames[userSelection];
				channel.send(message);

				discodeLog.appendLine("Sent message to \"" + userSelection + "\": \"" + message + "\"");
				vscode.window.showInformationMessage("Sent message to \"" + userSelection + "\".");
			});
		})
	});

	let connect = vscode.commands.registerCommand('discode.connect', () => {
		setStatus("Connecting...");

		client = new discord.Client();

		token = config.get("token");
		logOrNotification = config.get("logOrNotification");

		if (token == undefined || token === "" || token === null || token === "Token") {
			discodeLog.appendLine("You should enter your token to use extension.");
			return;
		}

		client.on('ready', () => setStatus("Connected!"));
		client.on('disconnect', () => setStatus("Disconnected!"));
		client.on('error', (error) => {
			setStatus("Error!", false);
			discodeLog.appendLine("Error: " + error.message);
		});

		client.on('message', (message) => {
			let channelType = message.channel.type;
			if (channelType !== 'text' &&
				message.author.id !== client.user.id) {
				let msg = message.author.username + " (" + message.channel + "): " + (message.attachments.size > 0 ? "<" + message.attachments.size + " attachment(s)>" : "") + message.content;

				if (logOrNotification === "Both" || logOrNotification === "Log") discodeLog.appendLine(msg);
				if (logOrNotification === "Both" || logOrNotification === "Notification") vscode.window.showInformationMessage(msg);
			}
		});

		client.login(token);
	});

	let disconnect = vscode.commands.registerCommand('discode.disconnect', () => {
		client.destroy();
		setStatus("Disconnected.");
	});

	context.subscriptions.push(sendMessage, connect, disconnect);

	if (enabled) vscode.commands.executeCommand('discode.connect');
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
