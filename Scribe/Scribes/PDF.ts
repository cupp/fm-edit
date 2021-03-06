import { AbstractScribe as scribe } from '../AbstractScribe';

import { LaTeX } from './LaTeX';

const nodeLatex = require('node-latex');
const base64 = require('base64-stream');

var PDF = function() {
	this.write = function(input) {
		var resolver;
		var rejecter;
		
		scribe.setScribe(LaTeX);
		
		const promise = new Promise((resolve, reject) => {
			resolver = resolve;
			rejecter = reject;
		});
		
		scribe.write(input).then((latexString) => {
			const output = base64.encode();
			
			const pdf = nodeLatex(latexString);
			
			pdf.pipe(output);
			
			const chunks = [];
			
			pdf.on('error', (error) => {
				rejecter(error);
			});

			output.on('data', (chunk) => {
				chunks.push(chunk);
			});

			output.on('end', () => {
				const base64PDF = chunks.join('');

				resolver(base64PDF);
			});

			output.on('error', (error) => {
				rejecter(error);
			});
		}).catch((error) => {
			rejecter(error);
		});
		
		return promise;
	};
};

const instance = new PDF();

export { instance as PDF };