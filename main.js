const { app, BrowserWindow, dialog } = require('electron');
const os = require('os')
const ipcMain = require('electron').ipcMain;
const fs = require('fs');
const glob = require('glob');
var directorySelected;

function allUppercase(filename) {
    return filename.toUpperCase();
}

function allLowercase(filename) {
    return filename.toLowerCase();
}

function wordJoinsToUnderscores(filename) {
    return filename.replace(/\s|\-/g, "_");
}

function wordJoinsToHyphens(filename) {
    return filename.replace(/\s|\_/g, "-");
}

function namedAsSpecified(filename, newName, counter) {
    let extension = filename.split(".").pop();
    let path = filename.substring(0, filename.lastIndexOf("/"));
    let newFilename = path + "/" + newName + counter + "." + extension;
    return newFilename;
}

function getFilesInDir(directory) {
    return glob.sync(directory+"/**/*.*")
}

function createWindow () {
    // Create the browser window.
	const win = new BrowserWindow({
		width: 800,
        height: 600,
		webPreferences: {
		nodeIntegration: true
		}
    });    

    win.maximize();
    
	// and load the index.html of the app.
	win.loadFile('index.html');
    
    //win.webContents.openDevTools();
    
    // When a directory is selected.
	ipcMain.on('selectDir', function (event, arg) {
        directorySelected = dialog.showOpenDialogSync(win, { properties: ['openDirectory'] });
        if (directorySelected) {
            directorySelected = directorySelected[0];
        }
        let filesInDir = getFilesInDir(directorySelected);
        
        // If the directory contains files, pass the info back to the calling script.
        if (filesInDir) {
            win.webContents.send('asynchronous-message', {'directorySelected': directorySelected, 'filesInDir': filesInDir});
        }
    });
    
    // Perform the renaming.
    ipcMain.on('go', function (event, arg) {
        let files = getFilesInDir(directorySelected);
        let counter = 1;

        files.forEach(function (file) {
            let path = file.substring(0, file.lastIndexOf("/"));
            let newFilename = file.substring(file.lastIndexOf("/") + 1, file.length);

            // Full rename overrides all other settings.
            if (arg.rename) {
                newFilename = namedAsSpecified(newFilename, arg.rename, counter);
                counter++;                
            } else {
                if (arg.joinWords == 'underscore') {
                    newFilename = wordJoinsToUnderscores(newFilename);
                }  
                
                if (arg.joinWords == 'hyphen') {
                    newFilename = wordJoinsToHyphens(newFilename);
                }  

                if (arg.case == 'upper') {
                    newFilename = allUppercase(newFilename);
                }

                if (arg.case == 'lower') {
                    newFilename = allLowercase(newFilename);
                }
            }

            fs.rename(file, path+'/'+newFilename, (err) => {
                if (err) throw err;
            });
        });

        dialog.showMessageBox({
            'title': 'Success',
            'message': 'File(s) renamed successfully'
        });

        directorySelected = null;
        
        win.webContents.send('asynchronous-message', {'renameSuccessful': true});
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

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
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});


