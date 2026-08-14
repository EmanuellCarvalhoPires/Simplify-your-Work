import { contextBridge as e, ipcRenderer as t } from "electron";
//#region electron/preload.ts
var n = {
	getMongoStatus: () => t.invoke("mongo:getStatus"),
	setMongoUri: (e) => t.invoke("mongo:setUri", e),
	getJiraInstances: () => t.invoke("jira:getInstances"),
	saveJiraInstance: (e) => t.invoke("jira:saveInstance", e),
	deleteJiraInstance: (e) => t.invoke("jira:deleteInstance", e),
	fetchJiraTicket: (e, n) => t.invoke("jira:fetchTicket", {
		ticketKey: e,
		instanceId: n
	}),
	fetchJiraTicketsByJql: (e, n) => t.invoke("jira:fetchTicketsByJql", {
		jqlOrLink: e,
		instanceId: n
	}),
	getAtlassianClientId: () => t.invoke("jira:getOAuthClientId"),
	saveAtlassianClientId: (e) => t.invoke("jira:saveOAuthClientId", e),
	getAtlassianClientSecret: () => t.invoke("jira:getOAuthClientSecret"),
	saveAtlassianClientSecret: (e) => t.invoke("jira:saveOAuthClientSecret", e),
	getAtlassianProxyUrl: () => t.invoke("jira:getOAuthProxyUrl"),
	saveAtlassianProxyUrl: (e) => t.invoke("jira:saveOAuthProxyUrl", e),
	startAtlassianOAuth: (e, n, r) => t.invoke("jira:startOAuth", e, n, r),
	cancelAtlassianOAuth: () => t.invoke("jira:cancelOAuth"),
	getSavedJqlQueries: () => t.invoke("jira:getSavedJqlQueries"),
	saveJqlQuery: (e) => t.invoke("jira:saveJqlQuery", e),
	deleteJqlQuery: (e) => t.invoke("jira:deleteJqlQuery", e),
	getTickets: () => t.invoke("tickets:getAll"),
	saveTicket: (e) => t.invoke("tickets:save", e),
	deleteTicket: (e) => t.invoke("tickets:delete", e),
	getReminders: () => t.invoke("reminders:getAll"),
	saveReminder: (e) => t.invoke("reminders:save", e),
	deleteReminder: (e) => t.invoke("reminders:delete", e),
	testReminder: (e) => t.invoke("reminders:test", e),
	getNotes: () => t.invoke("notes:getAll"),
	readNoteContent: (e) => t.invoke("notes:readContent", e),
	saveNoteContent: (e, n, r) => t.invoke("notes:saveContent", {
		filePath: e,
		title: n,
		content: r
	}),
	createNote: (e) => t.invoke("notes:create", e),
	createRichNote: (e) => t.invoke("notes:createRich", e),
	saveFileNote: (e) => t.invoke("notes:saveFileNote", e),
	deleteNote: (e) => t.invoke("notes:delete", e),
	exportNoteAsTxt: (e, n) => t.invoke("notes:exportTxt", {
		content: e,
		defaultFileName: n
	}),
	saveNoteImage: (e, n) => t.invoke("notes:saveImage", {
		base64Data: e,
		ext: n
	}),
	readLocalFile: (e) => t.invoke("system:readLocalFile", e),
	pickLocalFile: () => t.invoke("system:pickLocalFile"),
	syncCalendar: (e) => t.invoke("calendar:sync", e),
	getCalendarEvents: () => t.invoke("calendar:getEvents"),
	getCalendarUrl: () => t.invoke("calendar:getUrl"),
	setCalendarUrl: (e) => t.invoke("calendar:setUrl", e),
	getThemeSettings: () => t.invoke("theme:get"),
	saveThemeSettings: (e) => t.invoke("theme:save", e),
	getUsers: () => t.invoke("users:get"),
	getActiveUser: () => t.invoke("users:getActive"),
	setActiveUser: (e) => t.invoke("users:setActive", e),
	saveUser: (e) => t.invoke("users:save", e),
	deleteUser: (e) => t.invoke("users:delete", e),
	openExternal: (e) => t.invoke("system:openExternal", e),
	getLegalDocs: () => t.invoke("system:getLegalDocs")
};
try {
	process.contextIsolated ? e.exposeInMainWorld("electronAPI", n) : window.electronAPI = n;
} catch {
	window.electronAPI = n;
}
//#endregion
export {};
