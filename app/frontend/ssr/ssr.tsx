import ReactPDF from '@react-pdf/renderer';
import fs from 'fs';
import React from 'react';
import { PDFContent as PermitApplicationPDFContent } from '../components/shared/energy-savings-applications/pdf-content';
import '../i18n/i18n';
import { combineComplianceHints } from '../utils/formio-component-traversal';

const args = process.argv.slice(2);

const generatePdfs = async (filePath) => {
  try {
    const pdfJsonData = fs.readFileSync(filePath, 'utf-8');

    if (!pdfJsonData) {
      throw new Error('No pdfJson data provided');
    }

    const pdfData = JSON.parse(pdfJsonData);

    if (!pdfData.meta?.generationPaths) {
      throw new Error('No generationPaths provided in pdfData.meta');
    }

    if (!pdfData.permitApplication) {
      throw new Error('No permit application');
    }

    pdfData.permitApplication.formattedFormJson = combineComplianceHints(
      pdfData.permitApplication?.formJson ?? {},
      pdfData.permitApplication?.formCustomizations ?? {},
      pdfData.permitApplication?.formattedComplianceData ?? {},
    );

    const permitApplicationPDFPath = pdfData.meta.generationPaths.permitApplication;
    const assetDirectoryPath = pdfData.meta.assetDirectoryPath;

    if (permitApplicationPDFPath) {
      console.log('Rendering permit application PDF...');
      await ReactPDF.renderToFile(
        <PermitApplicationPDFContent
          permitApplication={pdfData.permitApplication}
          assetDirectoryPath={assetDirectoryPath}
        />,
        permitApplicationPDFPath,
      );

      if (fs.existsSync(permitApplicationPDFPath)) {
        const stats = fs.statSync(permitApplicationPDFPath);
        console.log(`✅ PDF file created: ${stats.size} bytes`);
      } else {
        console.warn('PDF file was not created despite successful render call');
      }
    }
  } catch (error) {
    console.error('Error generating pdf:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

generatePdfs(args[0]);
