import { Component } from '@angular/core';
import { remote } from 'electron';
// const { dialog } = remote;

//const {dialog} = require('electron').remote;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'app';

//   constructor() {
//     const menu = remote.Menu.buildFromTemplate([{
//       label: 'File',
//       submenu: [{
//         label: 'Open',
//         click: () => {
//   //        dialog.showOpenDialog({properties: ['openFile', 'openDirectory']});
//         }
//       }]
//     }]);
// //    remote.Menu.setApplicationMenu(menu);
  // }
}
