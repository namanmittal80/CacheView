
# Cashd
Cashd is an Electron application compatible with Windows and Mac that allows for the viewing and organization of cached websites. The application works off the local filesystem and supports the import of individual HTML files as well as full directory structures that are created by legacy applications such as Firefox's [Scrapbook](https://en.wikipedia.org/wiki/ScrapBook)

## Table of Contents
 - [Demo](#demo)
 - [Install](#install)
 - [Getting started](#getting-started)
 - [Features](#features)
 - [FAQ](#faq)
 - [Troubleshooting Issues](#troubleshooting-issues)
 - [Developer Install](#developer-install)
 - [Contributors](#contributors)
 - [Code derived from third party projects](#code-derived-from-third-party-projects)

## Demo
![](https://media.giphy.com/media/Jq8VpcJ4Eenzpfv1J1/giphy.gif)

## Install
Cashd can be installed from our landing page at: http://veinule.cs.umd.edu/

## Getting started
- Use your existing workflow to download a webpage (We recommend browser extensions such as  [Webscrapbook](https://github.com/danny0838/webscrapbook), [SingleFile](https://github.com/gildas-lormeau/SingleFile), or the legacy Firefox application Scrapbook)
- Open up Cashd and navigate to your workspace. Click import and select the relevant import option. Navigate to and select the file you downloaded in the file browser and click open
- Double click the file you just imported in the file explorer on the left to view

## Features

**Workspaces:** Workspaces allow for the grouping of similar saved files. Each workspace is separate from others and contains its own directory structure for further organization. Searches are limited to within the current workspace.

**Tabs:** Tabs allow for multiple cached pages to be opened up within the same window. This allows for fast switching between different pages and important pages to stay available in a familiar browser tab format.

**Notes:** Each saved page has note associated to it which can be used to jot down comments/thoughts. The note persists between sessions and can be used for future referencing.

**Search:** All pages within a workspace are indexed to support fast full-text search. Advanced search features such as wildcard `foo*`, field `title:Foo` or `full_text:Bar`, boosts `foo^10 bar`, fuzzy `foo~1`, and term presence `+foo bar -baz` are all supported through the search bar.

**Legacy:** Users of the legacy Firefox application Scrapbook can easily import their old file directories to Cashd and continue to interact with their saved pages.

## FAQ
See http://veinule.cs.umd.edu/documentation.html

## Troubleshooting Issues
**Missing files:** Since Cashd doesn't store it's own copy of your saved files and relies on the files to be saved in your file system, if files are moved, deleted, or renamed within your file system, the file will need to be reimported into Cashd.

**Search not working:** Since Cashd indexes all text on a web page, make sure the term you are searching for is a text value within the webpage. Common issues arise from browser extensions that do not support javascript loaded pages which leads to javascript loaded content to not be indexable by Cashd. 

## Developer Install
Use these steps to run the application in developer mode.

 1. Download and install Node.js and NPM using this [guide](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) 
 2. Clone this repository and navigate to the app folder
 3. Run `npm install`
 4. Start the application using `npm start`
 5. Open Developer tools in the electron window with `ctrl+option+i`
 6. Test data can be found in the `test_data/` directory

## Contributors
- Brandon Berry
- Edgar Zhu
- Jordan Mess
- Naman Mittal
- Sharvil Parekh
- Vincent Song

## Code derived from third party projects
- jstree: https://github.com/vakata/jstree
- lunrjs: https://github.com/olivernn/lunr.js
- chrome-tabs: https://github.com/adamschwartz/chrome-tabs