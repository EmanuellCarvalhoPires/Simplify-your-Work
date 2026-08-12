import { contextBridge, ipcRenderer } from "electron";
//#region electron/preload.ts
var api = {
	getMongoStatus: () => ipcRenderer.invoke("mongo:getStatus"),
	setMongoUri: (uri) => ipcRenderer.invoke("mongo:setUri", uri),
	getJiraInstances: () => ipcRenderer.invoke("jira:getInstances"),
	saveJiraInstance: (instance) => ipcRenderer.invoke("jira:saveInstance", instance),
	deleteJiraInstance: (id) => ipcRenderer.invoke("jira:deleteInstance", id),
	fetchJiraTicket: (ticketKey, instanceId) => ipcRenderer.invoke("jira:fetchTicket", {
		ticketKey,
		instanceId
	}),
	fetchJiraTicketsByJql: (jqlOrLink, instanceId) => ipcRenderer.invoke("jira:fetchTicketsByJql", {
		jqlOrLink,
		instanceId
	}),
	getSavedJqlQueries: () => ipcRenderer.invoke("jira:getSavedJqlQueries"),
	saveJqlQuery: (query) => ipcRenderer.invoke("jira:saveJqlQuery", query),
	deleteJqlQuery: (id) => ipcRenderer.invoke("jira:deleteJqlQuery", id),
	getTickets: () => ipcRenderer.invoke("tickets:getAll"),
	saveTicket: (ticket) => ipcRenderer.invoke("tickets:save", ticket),
	deleteTicket: (id) => ipcRenderer.invoke("tickets:delete", id),
	getReminders: () => ipcRenderer.invoke("reminders:getAll"),
	saveReminder: (reminder) => ipcRenderer.invoke("reminders:save", reminder),
	deleteReminder: (id) => ipcRenderer.invoke("reminders:delete", id),
	testReminder: (reminder) => ipcRenderer.invoke("reminders:test", reminder),
	getNotes: () => ipcRenderer.invoke("notes:getAll"),
	readNoteContent: (filePath) => ipcRenderer.invoke("notes:readContent", filePath),
	saveNoteContent: (filePath, title, content) => ipcRenderer.invoke("notes:saveContent", {
		filePath,
		title,
		content
	}),
	createNote: (title) => ipcRenderer.invoke("notes:create", title),
	createRichNote: (title) => ipcRenderer.invoke("notes:createRich", title),
	deleteNote: (id) => ipcRenderer.invoke("notes:delete", id),
	exportNoteAsTxt: (content, defaultFileName) => ipcRenderer.invoke("notes:exportTxt", {
		content,
		defaultFileName
	}),
	saveNoteImage: (base64Data, ext) => ipcRenderer.invoke("notes:saveImage", {
		base64Data,
		ext
	}),
	getThemeSettings: () => ipcRenderer.invoke("theme:get"),
	saveThemeSettings: (theme) => ipcRenderer.invoke("theme:save", theme),
	openExternal: (url) => ipcRenderer.invoke("system:openExternal", url)
};
try {
	if (process.contextIsolated) contextBridge.exposeInMainWorld("electronAPI", api);
	else window.electronAPI = api;
} catch (e) {
	window.electronAPI = api;
}
//#endregion
export {};
