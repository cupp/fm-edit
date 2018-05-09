const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

const createWindow = () => {
    // set timeout to render the window not until the Angular
    // compiler is ready to show the project
    setTimeout(() => {
        // Create the browser window.
        win = new BrowserWindow({
            width: 800,
            height: 600,
            icon: './src/favicon.ico'
        });

        // and load the app.
        win.loadURL(url.format({
            pathname: 'localhost:4200',
            protocol: 'http:',
            slashes: true
        }));

        win.webContents.openDevTools();

        // Emitted when the window is closed.
        win.on('closed', () => {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            win = null;
        });

        const template =  [
            {
                label: 'File',
                submenu: [
                    {
                        label: "Open", 
                        role: 'open',
                        click: () => {
                            dialog.showOpenDialog();
                        }
                    },
                    {label: "Save", role: 'save'},
                    {label: "Save As", role: 'saveas'}
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    {role: 'copy'}
                ]
            }
        ];
        
        if (process.platform === 'darwin') {
            template.unshift({
              label: "HELLO!!!",
              submenu: [
                {role: 'about'},
                {type: 'separator'},
                {role: 'services', submenu: []},
                {type: 'separator'},
                {role: 'hide'},
                {role: 'hideothers'},
                {role: 'unhide'},
                {type: 'separator'},
                {role: 'quit'}
              ]
            });
          console.log(template);
            // // Edit menu
            // template[1].submenu.push(
            //   {type: 'separator'},
            //   {
            //     label: 'Speech',
            //     submenu: [
            //       {role: 'startspeaking'},
            //       {role: 'stopspeaking'}
            //     ]
            //   }
            // );
          
            // // Window menu
            // template[3].submenu = [
            //   {role: 'close'},
            //   {role: 'minimize'},
            //   {role: 'zoom'},
            //   {type: 'separator'},
            //   {role: 'front'}
            // ];
        }
          
        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    
    }, 10000);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow();
    }
});

