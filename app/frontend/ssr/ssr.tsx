import ReactPDF from '@react-pdf/renderer';
import fs from 'fs';
import React from 'react';
import { PDFContent as StepCodeChecklistPDFContent } from '../components/domains/step-code/checklist/pdf-content';
import { PDFContent as PermitApplicationPDFContent } from '../components/shared/energy-savings-applications/pdf-content';
import '../i18n/i18n';
import { combineComplianceHints } from '../utils/formio-component-traversal';

const args = process.argv.slice(2);

const generatePdfs = async (filePath) => {
  console.log('=== PDF Generation Debug Start ===');
  console.log(`Input file: ${filePath}`);
  console.log(`Process PID: ${process.pid}`);
  console.log(`Node.js version: ${process.version}`);
  console.log(`Memory usage:`, process.memoryUsage());

  try {
    console.log('Step 1: Reading JSON file...');
    const pdfJsonData = fs.readFileSync(filePath, 'utf-8');
    console.log(`JSON file size: ${pdfJsonData.length} characters`);

    // Parse JSON pdfData
    if (!pdfJsonData) {
      throw new Error('No pdfJson data provided');
    }

    console.log('Step 2: Parsing JSON data...');
    const pdfData = JSON.parse(pdfJsonData);
    console.log(`JSON parsed successfully`);
    console.log(`Root keys: ${Object.keys(pdfData).join(', ')}`);

    if (!pdfData.meta?.generationPaths) {
      throw new Error('No generationPaths provided in pdfData.meta');
    }
    console.log(`Generation paths:`, pdfData.meta.generationPaths);

    if (!pdfData.permitApplication) {
      throw new Error('No permit application');
    }
    console.log(`Permit application ID: ${pdfData.permitApplication.id}`);
    console.log(`Form JSON present: ${!!pdfData.permitApplication.formJson}`);
    console.log(`Submission data present: ${!!pdfData.permitApplication.submissionData}`);

    // Log form complexity
    if (pdfData.permitApplication.formJson?.components) {
      const componentCount = JSON.stringify(pdfData.permitApplication.formJson.components).length;
      console.log(`Form JSON components size: ${componentCount} characters`);
      console.log(`Form components count: ${pdfData.permitApplication.formJson.components.length}`);
    }

    console.log('Step 3: Combining compliance hints...');
    pdfData.permitApplication.formattedFormJson = combineComplianceHints(
      pdfData.permitApplication?.formJson ?? {},
      pdfData.permitApplication?.formCustomizations ?? {},
      pdfData.permitApplication?.formattedComplianceData ?? {},
    );
    console.log(`Formatted form JSON created`);

    const permitApplicationPDFPath = pdfData.meta.generationPaths.permitApplication;
    const assetDirectoryPath = pdfData.meta.assetDirectoryPath;
    console.log(`Output path: ${permitApplicationPDFPath}`);
    console.log(`Asset directory: ${assetDirectoryPath}`);

    if (permitApplicationPDFPath) {
      console.log('Step 4: Starting React PDF rendering for permit application...');
      console.log(`Memory before render:`, process.memoryUsage());

      try {
        await ReactPDF.renderToFile(
          <PermitApplicationPDFContent
            permitApplication={pdfData.permitApplication}
            assetDirectoryPath={assetDirectoryPath}
          />,
          permitApplicationPDFPath,
        );
        console.log('✅ Permit application PDF rendered successfully!');
        console.log(`Memory after render:`, process.memoryUsage());

        // Verify file was created
        if (fs.existsSync(permitApplicationPDFPath)) {
          const stats = fs.statSync(permitApplicationPDFPath);
          console.log(`✅ PDF file created: ${stats.size} bytes`);
        } else {
          console.log('❌ PDF file was not created despite successful render call');
        }
      } catch (renderError) {
        console.log('❌ React PDF rendering failed!');
        console.log(`Render error type: ${renderError.constructor.name}`);
        console.log(`Render error message: ${renderError.message}`);
        console.log(`Render error stack:`, renderError.stack);
        throw renderError;
      }
    }

    if (pdfData.checklist) {
      console.log('Step 5: Starting React PDF rendering for step code checklist...');
      const stepCodeChecklistPDFPath = pdfData.meta.generationPaths.stepCodeChecklist;
      console.log(`Checklist output path: ${stepCodeChecklistPDFPath}`);

      if (stepCodeChecklistPDFPath) {
        try {
          await ReactPDF.renderToFile(
            <StepCodeChecklistPDFContent
              permitApplication={pdfData.permitApplication}
              checklist={pdfData.checklist}
              assetDirectoryPath={assetDirectoryPath}
            />,
            stepCodeChecklistPDFPath,
          );
          console.log('✅ Step code checklist PDF rendered successfully!');

          // Verify file was created
          if (fs.existsSync(stepCodeChecklistPDFPath)) {
            const stats = fs.statSync(stepCodeChecklistPDFPath);
            console.log(`✅ Checklist PDF file created: ${stats.size} bytes`);
          } else {
            console.log('❌ Checklist PDF file was not created despite successful render call');
          }
        } catch (checklistRenderError) {
          console.log('❌ Checklist React PDF rendering failed!');
          console.log(`Checklist render error: ${checklistRenderError.message}`);
          throw checklistRenderError;
        }
      }
    } else {
      console.log('Step 5: No checklist data, skipping checklist PDF generation');
    }

    console.log('=== PDF Generation Debug Complete ===');
  } catch (error) {
    console.error('❌ PDF Generation Failed!');
    console.error(`Error type: ${error.constructor.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack:`, error.stack);
    console.error(`Memory at error:`, process.memoryUsage());

    // Always log errors, not just in dev mode
    console.error('Error generating pdf:', error.message);

    // Exit with error code so Rails can detect the failure
    process.exit(1);
  }
};

// Assuming data is passed as a JSON string
generatePdfs(args[0]);
