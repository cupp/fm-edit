import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
  ViewContainerRef,
  ComponentFactoryResolver
} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {Observable} from 'rxjs/Observable';

import {QuillEditorComponent} from 'ngx-quill/src/quill-editor.component';

import {Symbols} from '../../model/symbols';

import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';

import * as QuillNamespace from 'quill';

const Quill: any = QuillNamespace;

import {SymbolPickerService} from '../symbol-picker/symbol-picker.service';
import {EditorService} from './editor.service';

import {convert} from '../../convert/convert';

import {PDFTeX} from './pdftex/pdftex';

import {HttpClient} from '@angular/common/http';

import {environment} from '../../../environments/environment';

declare const window: any;
const { remote, ipcRenderer} = window.require('electron');
const fs = remote.require('fs');
const { app, BrowserWindow} = window.require('electron');
const { dialog } = window.require('electron').remote;

// import {fs} from = require('fs');
// const {dialog} = require('electron').remote;

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class EditorComponent implements OnInit, OnDestroy {

  @ViewChild('autoCompleteContainer', {read: ViewContainerRef}) viewContainerRef: ViewContainerRef;

  keys = Object.keys;
  symbols = Symbols;

  editorInstance: any;
  previousEditorSelection: any;
  infoFilled: boolean;
  private infoFilledSubscription;
  outline: string;
  private outlineSubscription;
  hideSymbols = false;
  private hideSymbolsSubscription;
  private additionalProofSubscription;
  isReadOnly = false;
  form: FormGroup;
  modules = {};

  hintSpace = '          ';
  stepSpace = '     ';
  equalsUnicode = '\u003D';
  impliesUnicode = '\u21D2';
  followsFromUnicode = '\u21d0';
  lessThanUnicode = '\u003C';
  greaterThanUnicode = '\u003E';
  doesNotEqualUnicode = '\u2262';
  leftBracketUnicode = '\u3008';
  rightBracketUnicode = '\u3009';
  hintUnicode = '\t\t\t\t' + this.leftBracketUnicode + '  ' + this.rightBracketUnicode;
  shortHintUnicode = '\t\t\t' + this.leftBracketUnicode + '  ' + this.rightBracketUnicode;
  textSubUnicode = '\u2254';
  genQuantifierUnicode = '\u2605';
  lessThanOrEqUnicode = '\u2264';
  greaterThanorEqUnicode = '\u2265';
  elementOfUnicode = '\u2208';
  notElementOfUnicode = '\u2209';
  properSubsetOfUnicode = '\u2282';
  subsetOfUnicode = '\u2286';
  properSupersetOfUnicode = '\u2283';
  supersetOfUnicode = '\u2287';
  notProperSubsetOfUnicode = '\u2284';
  notSubsetOf = '\u2288';
  notProperSupersetOfUnicode = '\u2285';
  notSupersetOfUnicode = '\u2289';
  unionUnicode = '\u222a';
  intersectionUnicode = '\u2229';
  emptySetUnicode = '\u2205';
  conjuctionUnicode = '\u22c0';
  disjunctionUnicode = '\u22c1';
  equivalesUnicode = '\u2261';
  notEquivalesUnicode = '\u2262';
  doesNotImplyUnicode = '\u21cf';
  doesNotFollowFromUnicode = '\u21cd';
  universalQuantifierUnicode = '\u2200';
  existentialQuanitiferUnicode = '\u2203';
  endProofUnicode = '\u2571';
  integerUnicode = '\u2124';
  naturalUnicode = '\u2115';
  rationalUnicode = '\u211a';
  realUnicode = '\u211d';
  nextUnicode = '\u25cb';
  untilUnicode = '\u02af';
  alwaysUnicode = '\u25a1';
  eventuallyUnicode = '\u25c7';
  booleanSymbol = '𝔹';
  plusUnicode = '\u002B';
  padding = '  ';
  spacing = 5;
  bindings = {
    enter: {
      key: 13,
      handler: () => {
        this.hideSymbols = false;
        this.editorInstance.insertText(this.editorInstance.getSelection(), '\n' + ' '.repeat(this.spacing));
        this.previousEditorSelection = this.editorInstance.getSelection();
      }
    }
  };
  filename = '';
  constructor(fb: FormBuilder,
              private factoryResolver: ComponentFactoryResolver,
              private symbolService: SymbolPickerService,
              private editorService: EditorService,
              private http: HttpClient) {


    ipcRenderer.on('open-file', this.open.bind(this));
    ipcRenderer.on('save-file', this.save.bind(this));
    ipcRenderer.on('saveAs-file', this.saveAs.bind(this));

    this.infoFilledSubscription = this.editorService.infoFilledChange.subscribe(infoFilled => {
      this.infoFilled = infoFilled;
    });

    this.outlineSubscription = this.editorService.outlineChange.subscribe(outline => {
      this.outline = outline;
    });

    this.hideSymbolsSubscription = this.editorService.hideSymbolsChange.subscribe(hideSymbols => {
      this.hideSymbols = hideSymbols;
    });

    this.additionalProofSubscription = this.editorService.outlineAdditionChange.subscribe(proof => {
      this.outline += '<br />' + proof;
    });

    this.form = fb.group({
      editor: ['test']
    });

    this.modules = {
      keyboard: {
        bindings: this.bindings
      },
      formula: true,
      toolbar: true,
    };

  }

  @ViewChild('editor') editor: QuillEditorComponent;


  open() {
    this.filename = dialog.showOpenDialog({properties: ['openFile', 'openDirectory']}).toString();
    const quill = this.editorInstance;
    const textBuffer = fs.readFileSync(this.filename);
    const text = textBuffer.toString();
    quill.setText(text);
  }

  save() {
    if (this.filename !== '') {
      fs.writeFileSync(this.filename, 'My name is Luca');
    } else {
      this.file('saveAs');
    }
  }

  saveAs() {
    this.filename = dialog.showSaveDialog({properties: ['saveFile', 'openDirectory']});
    fs.writeFileSync(this.filename, 'My name is Luca');
  }

  ngOnInit() {
    this.form
      .controls
      .editor
      .valueChanges
      .debounceTime(400)
      .distinctUntilChanged()
      .subscribe(data => {
        console.log('native fromControl value changes with debounce', data);
      });

  }

  ngOnDestroy() {
    this.infoFilledSubscription.unsubscribe();
    this.outlineSubscription.unsubscribe();
    this.hideSymbolsSubscription.unsubscribe();
    this.additionalProofSubscription.unsubscribe();
  }

  generateSymbolShortcut(symbolIdentifier) {
    let symbolShortcut = '';

    switch (symbolIdentifier) {
      case 'not': {
        symbolShortcut = ';er';
        break;
      }
      default: {
        console.log('symbol could not be identified');
        break;
      }
    }

    return symbolShortcut;
  }

  insertSymbol(selectedVal) {
    this.editorInstance.insertText(this.editorInstance.getSelection(), ' ' + selectedVal.innerHTML.substring(0, 1) + ' ');
    this.editorInstance.setSelection(this.editorInstance.getSelection() + selectedVal.value.length + 2);
    this.previousEditorSelection = this.editorInstance.getSelection();
  }

  insertSymbolFromBible(selectedVal) {
    this.editorInstance.insertText(this.previousEditorSelection, selectedVal);
    this.editorInstance.setSelection(this.previousEditorSelection.index + selectedVal.length + 1);
    this.previousEditorSelection = this.editorInstance.getSelection();
  }

  symbolSelectorChanged(selectedVal) {
    switch (selectedVal) {
      case 'equals': {
        this.editorInstance.insertText(this.editorInstance.getSelection(), '\n');
        this.previousEditorSelection = this.editorInstance.getSelection();
        this.editorInstance.insertText(this.editorInstance.getSelection(), this.equalsUnicode + this.padding + this.hintUnicode);
        this.editorInstance.setSelection(this.previousEditorSelection.index - 2);
        this.hideSymbols = true;
        break;
      }
      case 'implies': {
        this.editorInstance.insertText(this.editorInstance.getSelection(), '\n');
        this.previousEditorSelection = this.editorInstance.getSelection();
        this.editorInstance.insertText(this.editorInstance.getSelection(), this.impliesUnicode + this.hintUnicode);
        this.editorInstance.setSelection(this.previousEditorSelection.index - 2);
        this.hideSymbols = true;
        break;
      }
      case 'followsFrom': {
        this.editorInstance.insertText(this.editorInstance.getSelection(), '\n');
        this.previousEditorSelection = this.editorInstance.getSelection();
        this.editorInstance.insertText(this.editorInstance.getSelection(), this.followsFromUnicode + this.hintUnicode);
        this.editorInstance.setSelection(this.previousEditorSelection.index - 2);
        this.hideSymbols = true;
        break;
      }
      case 'lessThan': {
        this.editorInstance.insertText(this.editorInstance.getSelection(), '\n');
        this.previousEditorSelection = this.editorInstance.getSelection();
        this.editorInstance.insertText(this.editorInstance.getSelection(), this.lessThanUnicode + this.padding + this.hintUnicode);
        this.editorInstance.setSelection(this.previousEditorSelection.index - 2);
        this.hideSymbols = true;
        break;
      }
      case 'lessThanOrEq': {
        this.editorInstance.insertText(this.editorInstance.getSelection(), '\n');
        this.previousEditorSelection = this.editorInstance.getSelection();
        this.editorInstance.insertText(this.editorInstance.getSelection(), this.lessThanOrEqUnicode + this.padding + this.hintUnicode);
        this.editorInstance.setSelection(this.previousEditorSelection.index - 2);
        this.hideSymbols = true;
        break;
      }
      case 'greaterThan': {
        this.editorInstance.insertText(this.editorInstance.getSelection(), '\n');
        this.previousEditorSelection = this.editorInstance.getSelection();
        this.editorInstance.insertText(this.editorInstance.getSelection(), this.greaterThanUnicode + this.padding + this.hintUnicode);
        this.editorInstance.setSelection(this.previousEditorSelection.index - 2);
        this.editorInstance.setSelection(this.previousEditorSelection.index - 2);
        this.hideSymbols = true;
        break;
      }
      case 'greaterThanOrEq': {
        this.editorInstance.insertText(this.editorInstance.getSelection(), '\n');
        this.previousEditorSelection = this.editorInstance.getSelection();
        this.editorInstance.insertText(this.editorInstance.getSelection(), this.greaterThanorEqUnicode + this.padding + this.hintUnicode);
        this.editorInstance.setSelection(this.previousEditorSelection.index - 2);
        this.hideSymbols = true;
        break;
      }
      default: {
        console.log('something other than equals was pressed');
        this.hideSymbols = true;
        break;
      }
    }
  }

  addNewThm() {
    this.editorService.toggleFormFilled();
  }


  bindKey(quill, text: string, prefix: string, key: any, shift: boolean = false, replace: boolean = true, hint = false, pair = false, quant = false) {
    // console.log('keySeq type = ' + typeof keySeq);
    // const key: string = (typeof keySeq === 'number' ? keySeq : keySeq.substr(keySeq.length - 1, 1));
    // const prefix: string = (typeof keySeq === 'number' ? '' : (keySeq.length > 1 ? keySeq.substr(0, keySeq.length - 1) : ''));
    let bindObj: Object;
    if (shift) {
      bindObj = {key: key, shiftKey: true};
    } else {
      bindObj = {key: key};
    }
    const anchor = (hint ? '\\s{5}' : '\\S*');
    const bindOptions = {
      collapsed: true,
      prefix: new RegExp(anchor + prefix + '$'),
      // offset: -10
    };
    if (hint) {
      // bindOptions.offset = 5 + prefix.length;
    }
    quill.keyboard.addBinding(bindObj, bindOptions,
    (range, context) => {
      quill.format('bold', false);
      quill.format('italic', false);
      let preLength = prefix.length;
      if (prefix.startsWith('\\')) {
          preLength--;
      }
      const off = (hint ? this.spacing + preLength : preLength);
      if (replace) {
        quill.deleteText(range.index - off, off);
      }
      quill.insertText(range.index - (replace ? off : 0), text);
      quill.setSelection(range.index + (hint ? + text.length - 7 - preLength : preLength + text.length - (pair ? 1 : quant ? 11 : 2)));
    });
  }

  bindHint(quill, text: string, prefix: string, key: any, shift: boolean = false, replace: boolean = true) {
    this.bindKey(quill, text, prefix, key, shift, replace, true);
  }

  bindPair(quill, text: string, prefix: string, key: any, shift: boolean = false, replace: boolean = true) {
    this.bindKey(quill, text, prefix, key, shift, replace, false, true);
  }

  bindQuant(quill, text: string, prefix: string, key: any, shift: boolean = false, replace: boolean = true) {
    this.bindKey(quill, text, prefix, key, shift, replace, false, false, true);
  }

  addBindingCreated(quill) {

    this.editorInstance = quill;

    quill.on('text-change', function () {
      this.hideSymbols = true;
    });

    quill.keyboard.addBinding(
      {key: 221},
      {
        collapsed: true
      },
      (range, context) => {
        quill.setSelection(range.index + 3);
      }
    );

    this.bindHint(quill, this.impliesUnicode + this.shortHintUnicode, ';i', 'm');             // implies
    this.bindHint(quill, this.impliesUnicode + this.shortHintUnicode, '>', 190, true);        // implies
    this.bindHint(quill, this.followsFromUnicode + this.shortHintUnicode, ';f', 'f');         // follows from
    this.bindHint(quill, this.followsFromUnicode + this.shortHintUnicode, '<', 188, true);    // follows from
    this.bindHint(quill, this.equalsUnicode + this.hintUnicode, '', 187);                     // equals
    this.bindHint(quill, this.lessThanUnicode + this.hintUnicode, ';l', 't');                 // less than
    this.bindHint(quill, this.lessThanOrEqUnicode + this.hintUnicode, ';l', 'e');             // less than or equal to
    this.bindHint(quill, this.greaterThanUnicode + this.hintUnicode, ';g', 't');              // greater than
    this.bindHint(quill, this.greaterThanorEqUnicode + this.hintUnicode, ';g', 'e');          // greater than or equal to

    this.bindPair(quill, '()', '', '9', true, false);                                          // parentheses
    this.bindPair(quill, '{}', '', 219, true, false);                                          // curly braces
    this.bindPair(quill, '[]', '', 219, false, false);                                         // square brackets

    this.bindKey(quill, '≺ ', ';i', 't');                                                      // it-relation
    this.bindKey(quill, '⪯ ', ';ra', 't');                                                     // rat-relation
    this.bindKey(quill, '≻ ', ';ii', 't');                                                     // inverse it-relation
    this.bindKey(quill, '⪰ ', ';ira', 't');                                                    // inverse rat-relation
    this.bindKey(quill, this.impliesUnicode + ' ', ';i', 'm');                                 // implies
    this.bindKey(quill, this.impliesUnicode + ' ', '>', 190, true);                            // implies
    this.bindKey(quill, this.followsFromUnicode + ' ', ';f', 'f');                             // follows from
    this.bindKey(quill, this.followsFromUnicode + ' ', '<', 188, true);                        // follows from
    this.bindKey(quill, this.lessThanUnicode + ' ', ';l', 't');                                // less than
    this.bindKey(quill, this.greaterThanUnicode + ' ', ';g', 't');                             // greater than
    this.bindKey(quill, this.lessThanOrEqUnicode + ' ', ';l', 'e');                            // less than or equal
    this.bindKey(quill, this.greaterThanorEqUnicode + ' ', ';g', 'e');                         // greater than or equal
    this.bindKey(quill, this.equivalesUnicode + ' ', '=', 187);                                // equivales
    this.bindKey(quill, this.conjuctionUnicode + ' ', ';a', 'n');                              // conjunction
    this.bindKey(quill, this.conjuctionUnicode + ' ', '&', '7', true);                         // conjunction
    this.bindKey(quill, this.disjunctionUnicode + ' ', ';o', 'r');                             // disjunction
    this.bindKey(quill, this.disjunctionUnicode + ' ', '\\|', 220, true);                      // disjunction
    this.bindKey(quill, '¬', '!', '1', true);                                                  // negation
    this.bindKey(quill, this.notEquivalesUnicode + ' ', '!', 187);
    this.bindKey(quill, this.textSubUnicode + ' ', ':', 187);                                  // replace by/gets
    this.bindKey(quill, '→ ', '-', 190, true);                                                 // right arrow
    this.bindKey(quill, this.leftBracketUnicode + ' ', ';l', 'b');                             // left hint bracket
    this.bindKey(quill, this.rightBracketUnicode, ';r', 'b');                                  // right hint bracket
    this.bindKey(quill, this.elementOfUnicode + ' ', ';e', 'l');                               // element of
    this.bindKey(quill, this.unionUnicode + ' ', ';u', 'n');                                   // union
    this.bindKey(quill, this.unionUnicode + ' ', '\\|', 220);                                  // union
    this.bindKey(quill, this.intersectionUnicode + ' ', ';i', 'n');                            // intersection
    this.bindKey(quill, this.intersectionUnicode + ' ', '&', '7');                             // intersection
    this.bindKey(quill, '÷ ', '/', 191);                                                       // division symbol
    this.bindKey(quill, '⋅ ', '\\*', '8', true);                                               // multiplication symbol
    this.bindKey(quill, this.genQuantifierUnicode + ' ', ';s', 't');                           // star symbol
    this.bindKey(quill, this.universalQuantifierUnicode, ';f', 'a');                           // forAll symbol
    this.bindKey(quill, this.existentialQuanitiferUnicode, ';e', 'x');                         // exists symbol

    this.bindKey(quill, 'Name:\t\t\t\t\nPin:\t\t\t\t\t\nClass:\t\t\t\t\nAssignment:\t\n\nProve ', ';hea', 'd');
    this.bindHint(quill, 'Prove ', ';p', 'r');
    this.bindKey(quill, 'by showing equivalence to previous theorem', ';', '1');
    this.bindKey(quill, 'by showing the LHS is equivalent to the RHS', ';', '2');
    this.bindKey(quill, 'by showing the RHS is equivalent to the LHS', ';', '3');
    this.bindKey(quill, 'by showing the LHS implies the RHS', ';', '4');
    this.bindKey(quill, 'by showing the LHS follows from the RHS', ';', '5');
    this.bindKey(quill, 'by assuming the conjuncts of the antecedent', ';', '6');
    this.bindKey(quill, '\nwhich is ', ';', 'w');
    this.bindKey(quill, 'textual substitution ', ';t', 's');

    this.bindQuant(quill, '(' + this.genQuantifierUnicode + ' |  : )', ';g', 'q');
    this.bindQuant(quill, '(' + this.universalQuantifierUnicode + ' |  : )', ';u', 'q');
    this.bindQuant(quill, '(' + this.existentialQuanitiferUnicode + ' |  : )', ';e', 'q');

    // // sigma
    // quill.keyboard.addBinding({key: 'q'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;s$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' σ ');
    //     quill.setSelection(range.index + 1);
    //   });

    // // pi
    // quill.keyboard.addBinding({key: 'i'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;p$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' π ');
    //     quill.setSelection(range.index + 1);
    //   });

    // // natural join
    // quill.keyboard.addBinding({key: 'n'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;j$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' ⨝ ');
    //     quill.setSelection(range.index + 1);
    //   });

    // // big-O
    // quill.keyboard.addBinding({key: 'o'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;b$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' Ο ');
    //     quill.setSelection(range.index);
    //   });

    // // big omega
    // quill.keyboard.addBinding({key: 'g'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;b$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' Ω ');
    //     quill.setSelection(range.index);
    //   });

    // // big theta
    // quill.keyboard.addBinding({key: 't'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;b$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' Θ ');
    //     quill.setSelection(range.index);
    //   });

    // // phi
    // quill.keyboard.addBinding({key: 'h'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;p$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' 𝜙 ');
    //     quill.setSelection(range.index + 1);
    //   });


    // universe
    quill.keyboard.addBinding({key: 's'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;u$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 2, ' Ʊ ');
        quill.setSelection(range.index + 1);
      });

    // proper subset
    quill.keyboard.addBinding({key: 'b'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;p$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 2, ' ' + this.properSubsetOfUnicode + ' ');
        quill.setSelection(range.index + 1);
      });

    // proper superset
    quill.keyboard.addBinding({key: 'p'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;p$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 2, ' ' + this.properSupersetOfUnicode + ' ');
        quill.setSelection(range.index + 1);
      });

    // subset
    quill.keyboard.addBinding({key: 'b'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;s$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 2, ' ' + this.subsetOfUnicode + ' ');
        quill.setSelection(range.index + 1);
      });

    // superset
    quill.keyboard.addBinding({key: 'p'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;s$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 2, ' ' + this.supersetOfUnicode + ' ');
      });

    // empty set
    quill.keyboard.addBinding({key: 's'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;e$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 2, ' ' + this.emptySetUnicode + ' ');
        quill.setSelection(range.index + 1);
      });



    // complement
    quill.keyboard.addBinding({key: 'o'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;c$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 2, ' ~ ');
        quill.setSelection(range.index + 1);
      });

    // power set
    quill.keyboard.addBinding({key: 's'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;p$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 2, ' Ρ ');
        quill.setSelection(range.index + 1);
      });

    // // up arrow
    // quill.keyboard.addBinding({key: 'a'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;u$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' ↑ ');
    //     quill.setSelection(range.index + 1);
    //   });

    // // left arrow
    // quill.keyboard.addBinding({key: 'a'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;l$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' ← ');
    //     quill.setSelection(range.index + 1);
    //   });

    // // down arrow
    // quill.keyboard.addBinding({key: 'a'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;d$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' ↓ ');
    //     quill.setSelection(range.index + 1);
    //   });
    // cross product
    quill.keyboard.addBinding({key: 'p'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;c$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 2, ' × ');
        quill.setSelection(range.index + 1);
      });


    // // function composition
    // quill.keyboard.addBinding({key: 'c'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;f$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' ∙ ');
    //     quill.setSelection(range.index + 1);
    //   });

    // // function product
    // quill.keyboard.addBinding({key: 'p'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;f$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' ∘ ');
    //     quill.setSelection(range.index + 1);
    //   });



    /////////// //////////////////////// not + symbols //////////////////////// ////////////////////////

    // does not imply
    quill.keyboard.addBinding({key: 'm'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;ni$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, ' ' + this.doesNotImplyUnicode + ' ');
        quill.setSelection(range.index + 1);
      });

    // does not follow from
    quill.keyboard.addBinding({key: 'f'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;nf$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, ' ' + this.doesNotFollowFromUnicode + ' ');
        quill.setSelection(range.index + 1);
      });

    // not equal
    quill.keyboard.addBinding({key: 'q'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;ne$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, ' ' + this.doesNotEqualUnicode + ' ');
        quill.setSelection(range.index + 1);
      });

    //not equivales
    quill.keyboard.addBinding({key: 'v'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;ne$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, ' ' + this.notEquivalesUnicode + ' ');
        quill.setSelection(range.index + 1);
      });

    // not element of
    quill.keyboard.addBinding({key: 'l'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;ne$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, ' ' + this.notElementOfUnicode + ' ');
        quill.setSelection(range.index + 1);
      });

    // not a subset
    quill.keyboard.addBinding({key: 'b'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;ns$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, ' ' + this.notSubsetOf + ' ');
        quill.setSelection(range.index + 1);

      });

    // not a superset
    quill.keyboard.addBinding({key: 'p'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;ns$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, ' ' + this.notSupersetOfUnicode + ' ');
        quill.setSelection(range.index + 1);
      });

    // not a proper superset
    quill.keyboard.addBinding({key: 'p'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;np$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, ' ' + this.notProperSupersetOfUnicode + ' ');
        quill.setSelection(range.index + 1);
      });

    // not a proper subset
    quill.keyboard.addBinding({key: 'b'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;np$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, ' ' + this.notProperSubsetOfUnicode + ' ');
        quill.setSelection(range.index + 1);
      });

    ////////////////////////////////// natural numbers, etc ///////////////////////////////
    // natural numbers
    quill.keyboard.addBinding({key: 'n'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;n$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 2, this.naturalUnicode + " ");
        quill.setSelection(range.index + 1);
      });

    // integers
    // quill.keyboard.addBinding({key: 'r'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;i$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, this.integerUnicode + " ");
    //     quill.setSelection(range.index + 1);
    //   });

    // rational
    // quill.keyboard.addBinding({key: 'a'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;r$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, this.rationalUnicode + " ")
    //     quill.setSelection(range.index + 1);
    //   });

    // real numbers
    quill.keyboard.addBinding({key: 'n'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;r$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 2, this.realUnicode + " ");
        quill.setSelection(range.index + 1);
      });

    // booleans
    quill.keyboard.addBinding({key: 'n'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;b$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 2, this.booleanSymbol + ' ');
        quill.setSelection(range.index + 1);
      });

    // end of proof
    quill.keyboard.addBinding({key: 'd'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;en$/
      },
      (range, context) => {
        quill.format('bold', false);
        quill.format('italic', false);
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, this.endProofUnicode + this.endProofUnicode);
      });

    ////////////////////////// temporal //////////////////////////
    // //next
    // quill.keyboard.addBinding({key: 't'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;nx$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 3, this.nextUnicode + " ");
    //     quill.setSelection(range.index - 1);
    //   });

    // //until
    // quill.keyboard.addBinding({key: 'l'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;ut$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 3, this.untilUnicode+ " ");
    //     quill.setSelection(range.index - 1);
    //   });

    // //eventually
    // quill.keyboard.addBinding({key: 't'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;ev$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 3, this.eventuallyUnicode+ " ");
    //     quill.setSelection(range.index - 1);
    //   });

    // //always
    // quill.keyboard.addBinding({key: 'w'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*;al$/
    //   },
    //   (range, context) => {
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //     quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 3, this.alwaysUnicode+ " ");
    //     quill.setSelection(range.index - 1);
    //   });

    // //gcd
    // quill.keyboard.addBinding({key: 'd'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*gc$/
    //   },
    //   (range, context) => {
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' gcd ', {'bold': true, 'italic': true});
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //   });

    // //mod
    // quill.keyboard.addBinding({key: 'd'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*mo$/
    //   },
    //   (range, context) => {
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' mod ', {'bold': true, 'italic': true});
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //   });

    // //lcm
    // quill.keyboard.addBinding({key: 'm'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*lc$/
    //   },
    //   (range, context) => {
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, ' lcm ', {'bold': true, 'italic': true});
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //   });


    // //abs
    // quill.keyboard.addBinding({key: 's'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*ab$/
    //   },
    //   (range, context) => {
    //     quill.deleteText(range.index - 2, 2); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 2, 'abs ', {'bold': true, 'italic': true});
    //     quill.format('bold', false);
    //     quill.format('italic', false);
    //   });

    //true
    quill.keyboard.addBinding({key: 'e'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*tru$/
      },
      (range, context) => {
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, 'true', 'italic', true);
        quill.format('italic', false);
      });

    //false
    quill.keyboard.addBinding({key: 'e'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*fals$/
      },
      (range, context) => {
        quill.deleteText(range.index - 4, 4); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 4, 'false ', 'italic', true);
        quill.format('italic', false);
      });

    // //weakest precondition
    // quill.keyboard.addBinding({key: 'p'}, {
    //     empty: false,
    //     collapsed: true,
    //     prefix: /\S*w$/
    //   },
    //   (range, context) => {
    //     quill.deleteText(range.index - 1, 1); // range.index-1 = user's cursor -1 -> where = character is
    //     quill.insertText(range.index - 1, 'wp.().R', 'italic', true);
    //     quill.format('italic', false);
    //     quill.setSelection(quill.getSelection());
    //   });


    //and-or, sum
    quill.keyboard.addBinding({key: 'm'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;su$/
      },
      (range, context) => {
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, '∑');
        quill.setSelection(range.index - 2);
      });

    //or-and
    quill.keyboard.addBinding({key: 'd'}, {
        empty: false,
        collapsed: true,
        prefix: /\S*;pr$/
      },
      (range, context) => {
        quill.deleteText(range.index - 3, 3); // range.index-1 = user's cursor -1 -> where = character is
        quill.insertText(range.index - 3, '∏');
        quill.setSelection(range.index - 2);
      });
  }


  updateSelection($event: any) {
    if (this.editorInstance.getSelection()) {
      this.previousEditorSelection = this.editorInstance.getSelection();
    }
  }

  file(selectedVal) {
    // switch (selectedVal) {
    //   case 'open' :
    //     const tempName = dialog.showOpenDialog({properties: ['openFile', 'openDirectory']}).toString();
    //     if (tempName !== '') {
    //       this.filename = tempName;
    //       const text = fs.readFileSync(this.filename).toString();
    //       this.editorInstance.setText(text);
    //     }
    //     break;
    //   case 'save' :
    //     if (this.filename !== '') {
    //       fs.writeFileSync(this.filename, 'My name is Luca');
    //     } else {
    //       this.file('saveAs');
    //     }
    //     break;
    //   case 'saveAs' :
    //     this.filename = dialog.showSaveDialog({properties: ['saveFile', 'openDirectory']});
    //     fs.writeFileSync(this.filename, 'My name is Luca');
    //   }
    }
  }

  // file(selectedVal) {
  //   const loader = document.getElementById('exportLoader');

  //   loader.style.visibility = 'visible';

  //   const text = this.editorInstance.getText();

  //   const pin = (0 + (text.match(/Pin:\s?(\d{1,})/m)[1])).slice(-2);
  //   const assignment = (text.match(/Assignment:\s?(\d{1,})/m))[1];

  //   const dev_apiURL = 'http://localhost:4201/scribe/';

  //   // Proof name
  //   const proofName = (pin + 'a' + assignment).toLowerCase() + "written." + selectedVal;

  //   const contentTypes = {
  //     pdf: 'application/pdf',
  //     txt: 'txt/plain'
  //   }

  //   this.http.post(dev_apiURL + selectedVal, {
  //     text
  //   }, {
  //     headers: {
  //       'Content-Type': 'application/json'
  //     }
  //   }).subscribe((data: { base64: string }) => {

  //     // Create blob

  //     const contentType = contentTypes[selectedVal];
  //     const sliceSize = 512;

  //     const byteChars = atob(data['base64']);
  //     const byteArrays = [];

  //     for (let offset = 0; offset < byteChars.length; offset += sliceSize) {
  //       const slice = byteChars.slice(offset, offset + sliceSize);

  //       let byteNums = new Array(slice.length);

  //       for (let i = 0; i < slice.length; i++) {
  //         byteNums[i] = slice.charCodeAt(i);
  //       }

  //       const byteArray = new Uint8Array(byteNums);

  //       byteArrays.push(byteArray);
  //     }

  //     const blob = new Blob(byteArrays, {type: contentType});
  //     const blobURL = window.URL.createObjectURL(blob);

  //     // Download blob

  //     const a = document.createElement('a');

  //     document.body.appendChild(a);

  //     a.href = blobURL;
  //     a.download = proofName;

  //     a.click();

  //     // Reset button/loader

  //     loader.style.visibility = 'hidden';
  //   }, error => {
  //     alert(error['error']);

  //     loader.style.visibility = 'hidden';
  //   });
  // }
