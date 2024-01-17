/*
 * Copyright 2017 balena.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as path from 'path';
import * as electron from 'electron';
import * as electronLog from 'electron-log';
import { open as openInternal } from './app/os/open-internal/services/open-internal';
import { displayName } from '../../package.json';

import * as i18next from 'i18next';

/**
 * @summary Builds a native application menu for a given window
 */
export function buildWindowMenu(window: electron.BrowserWindow) {
	/**
	 * @summary Toggle the main window's devtools
	 */
	function toggleDevTools() {
		if (!window) {
			return;
		}
		// NOTE: We can't use `webContents.toggleDevTools()` here,
		// as we need to force detached mode
		if (window.webContents.isDevToolsOpened()) {
			window.webContents.closeDevTools();
		} else {
			window.webContents.openDevTools({
				mode: 'detach',
			});
		}
	}

	const menuTemplate: electron.MenuItemConstructorOptions[] = [
		{
			role: 'editMenu',
			label: i18next.t('menu.edit'),
		},
		{
			role: 'viewMenu',
			label: i18next.t('menu.view'),
		},
		{
			role: 'windowMenu',
			label: i18next.t('menu.window'),
		},
		{
			role: 'help',
			label: i18next.t('menu.help'),
			submenu: [
				{
					label: i18next.t('menu.pro'),
					click() {
						openInternal('https://www.balena.io/etcher-pro?utm_source=etcher_menu&ref=etcher_menu');
					},
				},
				{
					label: i18next.t('menu.website'),
					click() {
						openInternal('https://etcher.balena.io?ref=etcher_menu');
					},
				},
				{
					label: i18next.t('menu.issue'),
					click() {
						openInternal('https://github.com/balena-io/etcher/issues');
					},
				},
				{
					label: i18next.t('menu.gpu'),
					accelerator: 'CmdorCtrl+Alt+G',
					click() {
						electronLog.info('Opening chrome://gpu');
						openInternal('chrome://gpu');
					}
				},
				{
					label: 'Open Test Window',
					accelerator: 'CmdorCtrl+N',
					click() {
						electronLog.info('Opening Test Window');
						openInternal('https://www.google.com/');
					}
				},
				{
					label: i18next.t('menu.about'),
					accelerator: 'CmdorCtrl+Alt+A',
					click(item) {
						const aboutWindow = new electron.BrowserWindow({
						width: 400,
						height: 400,
						useContentSize: true,
						autoHideMenuBar: true,
						title: 'About Etcher-ng',
						webPreferences: {
							nodeIntegration: false,
							nodeIntegrationInWorker: false,
							contextIsolation: false,
							sandbox: false,
							experimentalFeatures: true,
							webviewTag: true,
							devTools: true,
							preload: path.join(__dirname, 'lib/gui/preload.js')											   
						},
					});
					require("@electron/remote/main").enable(aboutWindow.webContents);
					aboutWindow.loadFile(path.join(__dirname,'lib/gui/about.html'));
					electronLog.info('Opened about.html');
					}
				}
			],
		},
	];

	if (process.platform === 'darwin') {
		menuTemplate.unshift({
			label: displayName,
			submenu: [
				{
					role: 'about' as const,
					label: i18next.t('menu.about'),
				},
				{
					type: 'separator' as const,
				},
				{
					role: 'hide' as const,
					label: i18next.t('menu.hide'),
				},
				{
					role: 'hideOthers' as const,
					label: i18next.t('menu.hideOthers'),
				},
				{
					role: 'unhide' as const,
					label: i18next.t('menu.unhide'),
				},
				{
					type: 'separator' as const,
				},
				{
					label: i18next.t('menu.goback'),
					accelerator: 'Alt+Left',
					click(item, focusedWindow) {
						if (focusedWindow) focusedWindow.webContents.goBack();
						electronLog.info('Navigated back');
					}
				},
				{
					label: i18next.t('menu.goforward'),
					accelerator: 'Alt+Right',
					click(item, focusedWindow) {
						if (focusedWindow) focusedWindow.webContents.goForward();
						electronLog.info('Navigated forward');
					}
				},
				{
					role: 'quit' as const,
					label: i18next.t('menu.quit'),
				},
			],
		});
	} else {
		menuTemplate.unshift({
			label: displayName,
			submenu: [
				{
					label: i18next.t('menu.goback'),
					accelerator: 'Alt+Left',
					click(item, focusedWindow) {
						if (focusedWindow) focusedWindow.webContents.goBack();
						electronLog.info('Navigated back');
					}
				},
				{
					label: i18next.t('menu.goforward'),
					accelerator: 'Alt+Right',
					click(item, focusedWindow) {
						if (focusedWindow) focusedWindow.webContents.goForward();
						electronLog.info('Navigated forward');
					}
				},
				{
					role: 'quit',
				},
			],
		});
	}

	const menu = electron.Menu.buildFromTemplate(menuTemplate);

	electron.Menu.setApplicationMenu(menu);
}
