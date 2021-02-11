const chip = require('./chip8');
const chipDisplay = require('./chip8display');

const electron = require('electron');
const url = require('url');
const path = require('path');

const {app, BrowserWindow, Menu} = electron;
let mainWindow;

app.on('ready', function(){
    mainWindow = new BrowserWindow({width: 1280, height: 720, webPreferences: { nodeIntegration: true }});
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    mainWindow.webContents.openDevTools();
    mainWindow.title = "Ducxy's Chip 8 Interpreter"
    Menu.setApplicationMenu(null);

    mainWindow.on('closed', function(){
        app.quit();
    })
})

