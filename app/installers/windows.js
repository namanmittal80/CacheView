const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.error(error.message || error)
    process.exit(1)
  })

function getInstallerConfig () {
  console.log('creating windows installer')
  const rootPath = path.join('./')
  const outPath = path.join(rootPath, 'release-builds')

  return Promise.resolve({
    appDirectory: path.join(outPath, 'cashd-win32-ia32/'),
    authors: 'BrandonBerry,VincentSong,Sharvil,JordanMess,NamanMittal,EdgarZhu',
    noMsi: true,
    outputDirectory: path.join(outPath, 'windows-installer'),
    exe: 'cashd.exe',
    setupExe: 'SetUpcashd.exe',
    setupIcon: path.join(rootPath, 'assets', 'icons', 'win', 'icon.ico'),
    description: 'This is a description'
  })
}