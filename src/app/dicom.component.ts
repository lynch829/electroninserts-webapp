import { Component, OnInit, ApplicationRef, ViewChild } from '@angular/core';

import { Router } from '@angular/router';

import { Coordinates } from './coordinates'
import { Parameterisation } from './parameterisation';

import { TitleService } from './title.service';

import { safeLoad } from 'js-yaml';

declare var Module: any;
declare var FS: any;
// declare var yaml: any;
// declare var pypyjs: any;

@Component({
  selector: 'my-dicom',
  templateUrl: './dicom.component.html',
  styles: ['./dicom.component.css']
})
export class DicomComponent implements OnInit {
  parameterisation: Parameterisation = {
    insert: {
      x: [0],
      y: [0]
    },
    width: null,
    length: null,
    circle: null,
    ellipse: null
  };

  rawBlockData: string = '';
  vectorData: string = '';
  parseDataString: string = '';

  dicomWarning: string;
  dicomExitCode = 1;

  dicomX: number[];
  dicomY: number[];
  dicomInsert: Coordinates;

  insertList: any[];

  header: string = '';

  reader = new FileReader();
  firstLoad = true;

  constructor(
    private myTitleService: TitleService,
    private router: Router
  ) { }

  @ViewChild('dicomOutput') dicomOutputDir: any;
  @ViewChild('getBlockDataButton') getBlockDataButton: any;


  ngOnInit() {
    this.reader.onload = () => this.onceFileIsLoaded();

    localStorage.removeItem('dicomPrint');
    Module.print = this.sendDicomDumpToLocalStorage;
    // Module.printErr = this.sendDicomDumpToLocalStorage;
    this.myTitleService.setTitle('Dicom');

    // pypyjs.exec("import json; print json.dumps({'hello': 'world'})")
    // pypyjs.exec("import dicom; print json.dumps({'hello': 'world'})")
  }

  sendDicomDumpToLocalStorage(print: any) {
    let priorDicomPrint = localStorage.getItem('dicomPrint');
    localStorage.setItem('dicomPrint', priorDicomPrint + '\n' + print);
  }

  updateDicomWarning() {
    let status = Number(localStorage.getItem('dicomLoadStatus'));
    if (status == 0) {
      this.getBlockDataButton.disabled = false;
      this.dicomWarning = null;
    }
    else {
      this.getBlockDataButton.disabled = true;
      this.dicomWarning = 'An error occured while trying to find the block data within the provided Dicom file.';
    }
  }

  onceFileIsLoaded() {
    let content = new Int8Array(this.reader.result);
    console.log(content.length);
    // let fileName = Math.random().toString(36).substr(2, 5);
    // console.log(fileName);
    let fileName = 'dicomfile';

    if (FS.isFile(fileName)) {
      FS.unlink(fileName);
    }
    FS.writeFile(fileName, content, {encoding: "binary"});

    let exit_orig = Module.exit;    
    Module.exit = (status: any) => {
      localStorage.setItem('dicomLoadStatus', status);
      exit_orig(status);
    }
    Module.callMain(['dcmdump', fileName, '--print-all']);
    // if (Module.calledRun) {
    //   Module.callMain(['dcmdump', fileName, '--print-all']);
    // }
    // else {
      // Module.callMain(
      //   ['dcmdump', fileName, '--print-all', '--search', '300a,0106'] // http://support.dcmtk.org/docs/dcmdump.html
      // );
    // }

    Module.exit = exit_orig;

    console.log(Module)

    this.updateDicomWarning()
    FS.unlink(fileName);
  }

  openFile(event: any) {
    console.log(event.srcElement.files);
    let file = event.srcElement.files[0];

    localStorage.removeItem('dicomPrint');
    localStorage.setItem('dicomPrint', ' ');

    this.reader.readAsArrayBuffer(file);
  }

  convertDicomDumpToDict(dump: string) {
    let yamlConvert = dump.replace(/\s*#[^#\n]*\n/g,'\n');
    yamlConvert = yamlConvert.replace(/\s*#[^#\n]*$/g,'');
    yamlConvert = yamlConvert.replace(/^\n*/,'');
    yamlConvert = yamlConvert.replace(/(\([0-9a-f][0-9a-f][0-9a-f][0-9a-f],[0-9a-f][0-9a-f][0-9a-f][0-9a-f]\))/g,'$1:')
    yamlConvert = yamlConvert.replace(
      /(\([0-9a-f][0-9a-f][0-9a-f][0-9a-f],[0-9a-f][0-9a-f][0-9a-f][0-9a-f]\):) SQ \(Sequence with undefined length #=\d+\)/g,
      '$1')
    yamlConvert = yamlConvert.replace(
      /(\([0-9a-f][0-9a-f][0-9a-f][0-9a-f],[0-9a-f][0-9a-f][0-9a-f][0-9a-f]\):) na \(Item with undefined length #=\d+\)/g,
      '$1')
    yamlConvert = yamlConvert.replace(
      / *\(fffe,e00d\): na \(ItemDelimitationItem\) *\n/g,
      '')
    yamlConvert = yamlConvert.replace(
      / *\(fffe,e0dd\): na \(SequenceDelimitationItem\)\n/g,
      '')
    yamlConvert = yamlConvert.replace(
      /(\([0-9a-f][0-9a-f][0-9a-f][0-9a-f],[0-9a-f][0-9a-f][0-9a-f][0-9a-f]\):) (.*)/g,
      '$1 "$2"')
    yamlConvert = yamlConvert.replace(/\\/g, ', ')
    yamlConvert = yamlConvert.replace(/\(fffe,e000\):/g, ' - ')

    yamlConvert = safeLoad(yamlConvert);

    return yamlConvert;
  }

  convertBlockDataToCoords(blockData: string): Coordinates {
    let listString = /\[[, \d\.-]*\]/.exec(blockData).toString();
    // console.log(listString);
    let parsedData = JSON.parse('{ "data": ' + listString + '}');

    let x: number[] = [];
    let y: number[] = [];
    let i = 0;
    for (let num of parsedData['data']) {
      if (i % 2 == 0) {
        x.push(parseFloat((num / 10).toFixed(2)));
      }
      else {
        y.push(parseFloat((num / 10).toFixed(2)));
      }
      i++;
    }
    let insert = {
      "x": x,
      "y": y
    };

    return insert;
  }

  dicomPullFloat(input: string): number {
    return Number(input.replace(/.*\[([\d\.-]*)\].*/, "$1"));
  }

  dicomPullString(input: string): string {
    return input.replace(/.*\[(\w*)\].*/, "$1");
  }

  getBlockData() {
    let dicomPrint = localStorage.getItem('dicomPrint');
    let dicomDict = this.convertDicomDumpToDict(dicomPrint);

    this.insertList = [];  // Later on update this to be an object that includes all insert details

    let beamSequence = dicomDict["(300a,00b0)"];
    for (let beam of beamSequence) {
      let blockData = beam["(300a,00f4)"][0]["(300a,0106)"];
      let coordinates = this.convertBlockDataToCoords(blockData);

      let applicator = this.dicomPullString(
        beam["(300a,0107)"][0]["(300a,0108)"]);
      let energy = this.dicomPullFloat(
        beam["(300a,0111)"][0]["(300a,0114)"]);
      let ssd = this.dicomPullFloat(
        beam["(300a,0111)"][0]["(300a,0130)"]) / 10;

      let insert = {
        "coordinates": coordinates,
        "applicator": applicator,
        "energy": energy,
        "ssd": ssd
      }
      this.insertList.push(insert)
    }

    console.log(this.insertList);

    this.dicomInsert = this.insertList[0]["coordinates"];
  }

  sendToParameterisation(insert: any) {
    this.insertUpdated(insert);
    localStorage.setItem(
      "last_parameterisation", JSON.stringify(this.parameterisation)
    );
    this.router.navigate(["/parameterise"])
  }

  parameterisationFromLocalStorage(localStorageParameterisationString: string) {
    let localStorageParameterisation = JSON.parse(localStorageParameterisationString); 
    this.parameterisation.insert = localStorageParameterisation['insert'];
    this.parameterisation.width = localStorageParameterisation['width'];
    this.parameterisation.length = localStorageParameterisation['length'];
    this.parameterisation.circle = localStorageParameterisation['circle'];
    this.parameterisation.ellipse = localStorageParameterisation['ellipse'];
  }

  insertUpdated(insert: any) {
    let localStorageParameterisation = localStorage.getItem(JSON.stringify(insert))
    if (localStorageParameterisation) {
      this.parameterisationFromLocalStorage(localStorageParameterisation);
    }
    else {
      this.parameterisation.insert = insert;
      this.parameterisation.width = null;
      this.parameterisation.length = null;
      this.parameterisation.circle = null;
      this.parameterisation.ellipse = null;
    }
  }


}