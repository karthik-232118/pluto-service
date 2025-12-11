const { Op, Sequelize, literal, QueryTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const { sequelize } = require("../../model");
const moment = require("moment");
const path = require("path");
const axios = require("axios");
require("dotenv").config();
const UserDetails = require("../../model/UserDetails");
const { logger } = require("../../utils/services/logger");
const ESignRequest = require("../../model/ESignRequest");
const ESignDocument = require("../../model/ESignDocument");
const ESignReceiver = require("../../model/ESignReceiver");
const ESignActivity = require("../../model/ESignActivity");
const { placeMarkersOnPDF } = require("../../utils/pdfMarker");
const helper = require("../../utils/helper");
const { eSignMailService } = require("../../utils/services/nodemailer");
const jwt = require("jsonwebtoken");
const ResourceAccess = require("../../model/ResourceAccess");
const FormModuleDraft = require("../../model/FormModuleDraft");
const FormModule = require("../../model/FormModule");
const CampaignParticipant = require("../../model/CampaignParticipant");
const Campaign = require("../../model/Campaign");
const DocumentModule = require("../../model/DocumentModule");
const DocumentModuleDraft = require("../../model/DocumentModuleDraft");
const { viewDocumentModuleDraft } = require("../admin/admin.controller");
const fs = require("fs");
const EditedDocumentVersion = require("../../model/EditedDocumentVersion");
const unzipper = require("unzipper");
const xml2js = require("xml2js");
const {
  documentEditSuccess,
  documentEditFailure,
} = require("../../utils/services/socket");
const DocumentTemplate = require("../../model/DocumentTemplate");
const SkillsClickEvent = require("../../model/SkillsClickEvent");

exports.getESignRequestById = async (req, res) => {
  const t = await sequelize.transaction();
  const { ESignRequestID } = req.params;
  const { receiverId, ip } = req.query;

  try {
    const eSignRequest = await ESignRequest.findOne({
      where: {
        ESignRequestID,
      },
      transaction: t,
    });

    const eSignDocument = await ESignDocument.findOne({
      where: {
        ESignDocumentID: eSignRequest.ESignDocumentID,
      },
      transaction: t,
    });

    if (!eSignDocument) {
      await t.rollback();
      return res.status(404).send({
        error: "ESign document not found",
      });
    }

    const eSignReceiver = await ESignReceiver.findOne({
      where: {
        ESignReceiverID: receiverId,
        ESignRequestID,
      },
      transaction: t,
    });

    const activity = {
      description: `${eSignReceiver.UserName} opened the document`,
      ip_address: ip || "not available",
      date: new Date().toISOString(),
    };

    const eSignActivity = await ESignActivity.findOne({
      where: {
        ESignRequestID,
        ESignReceiverID: receiverId,
      },
      transaction: t,
    });

    if (eSignActivity) {
      const existingActivity = eSignActivity.Activities;

      existingActivity.push(activity);

      await ESignActivity.update(
        {
          Activities: existingActivity,
        },
        {
          where: {
            ESignRequestID,
            ESignReceiverID: receiverId,
          },
          transaction: t,
        }
      );
    } else {
      await ESignActivity.create(
        {
          ESignRequestID,
          ESignReceiverID: receiverId,
          Activities: [activity],
          CreatedBy: receiverId,
        },
        {
          transaction: t,
        }
      );
    }

    await t.commit();
    res.status(200).send({
      message: "",
      data: {
        eSignRequest,
        eSignReceiver,
        eSignDocument,
      },
    });
  } catch (error) {
    await t.rollback();
    console.log(error);
    logger.error({
      message: error.message,
      details: error.message,
      stack: error.stack,
      ReceiverId: receiverId,
    });
    res.status(500).send({
      error: "Something went wrong!",
    });
  }
};

exports.fillESignRequest = async (req, res) => {
  const t = await sequelize.transaction();

  const { ESignRequestID, ESignReceiverID, Markers, IP } = req.body;

  let pathToRemove;

  try {
    const eSignRequest = await ESignRequest.findOne({
      where: {
        ESignRequestID,
      },
      transaction: t,
    });

    const eSignReceiver = await ESignReceiver.findOne({
      where: {
        ESignReceiverID,
        ESignRequestID,
      },
      transaction: t,
    });

    const eSignActivity = await ESignActivity.findOne({
      where: {
        ESignRequestID,
        ESignReceiverID,
      },
      transaction: t,
    });

    const eSignDocument = await ESignDocument.findOne({
      where: {
        ESignDocumentID: eSignRequest.ESignDocumentID,
      },
      attributes: ["ESignDocumentID", "ESignDocumentName", "ESignDocumentURL"],
      transaction: t,
    });

    const eSignCreatedBy = await UserDetails.findOne({
      where: {
        UserID: eSignRequest.CreatedBy,
      },
      attributes: ["UserEmail"],
      transaction: t,
    });

    const eSignReceiverMarkers = eSignReceiver.Markers;
    const cc = eSignRequest.CC;

    if (eSignReceiver.Status == "Signed") {
      await t.rollback();
      return res.status(400).json({
        status: false,
        message: "Receiver already signed the document",
        data: null,
      });
    }

    let markersWithCoordinates = Markers.map((marker) => {
      let existingMarker = eSignReceiverMarkers.find(
        (m) => m.markerId == marker.markerId
      );
      if (existingMarker) {
        return {
          ...marker,
          x: existingMarker.x,
          y: existingMarker.y,
          pageNumber: existingMarker.pageNumber,
        };
      }

      return { ...marker, x: 0, y: 0, pageNumber: 0 };
    });

    let signedDocumentFileUrl;
    const pdfUniqueID = `${eSignDocument.ESignDocumentID}_${ESignReceiverID}`;
    const documentUrl = `${process.env.BACKEND_URL}${eSignDocument.ESignDocumentURL}`;
    signedDocumentFileUrl = await placeMarkersOnPDF(
      documentUrl,
      markersWithCoordinates,
      pdfUniqueID
    );

    pathToRemove = path.posix.join(...signedDocumentFileUrl.split(path.sep));

    const activity = {
      description: `${eSignReceiver.UserName} signed the document`,
      ip_address: IP || "not available",
      date: new Date().toISOString(),
    };

    await ESignReceiver.update(
      {
        Status: "Signed",
      },
      {
        where: {
          ESignRequestID,
          ESignReceiverID,
        },
        transaction: t,
      }
    );

    if (eSignActivity) {
      const existingActivity = eSignActivity.Activities;

      existingActivity.push(activity);

      await ESignActivity.update(
        {
          Activities: existingActivity,
          SignedDocumentURL: signedDocumentFileUrl,
        },
        {
          where: {
            ESignRequestID,
            ESignReceiverID,
          },
          transaction: t,
        }
      );
    } else {
      await ESignActivity.create(
        {
          ESignRequestID,
          ESignReceiverID,
          Activities: [activity],
          SignedDocumentURL: signedDocumentFileUrl,
          CreatedBy: ESignReceiverID,
        },
        {
          transaction: t,
        }
      );
    }

    // const updatedActivity = await ESignActivity.findOne({
    //   where: {
    //     ESignRequestID,
    //     ESignReceiverID,
    //   },
    //   transaction: t,
    // });

    // const documentUrl = `${process.env.BACKEND_URL}${signedDocumentFileUrl}`;

    // try {
    //   signedDocumentFileUrl = await addActivityLogOnPDF(
    //     documentUrl,
    //     updatedActivity.Activities,
    //     eSignDocument.ESignDocumentID,
    //     eSignRequest.Status
    //   );
    // } catch (error) {
    //   throw error;
    // }

    // pathToRemove = path.posix.join(...signedDocumentFileUrl.split(path.split));

    // await ESignActivity.update(
    //   {
    //     SignedDocumentURL: signedDocumentFileUrl,
    //   },
    //   {
    //     where: {
    //       ESignRequestID,
    //       ESignReceiverID,
    //     },
    //     transaction: t,
    //   }
    // );

    const [totalSignedReceiverCount, totalReceiverCount] = await Promise.all([
      ESignReceiver.count({
        where: {
          ESignRequestID,
          Status: "Signed",
        },
        transaction: t,
      }),
      ESignReceiver.count({
        where: {
          ESignRequestID,
        },
        transaction: t,
      }),
    ]);

    let emailBody = `
                  Signed an e-sign request document
  
                  Please find the attached document
                  `;

    await eSignMailService({
      recipientEmail: eSignReceiver.UserEmail,
      subject: `${eSignDocument.ESignDocumentName} Document Signed`,
      body: {
        html: emailBody,
      },
      attachments: [
        {
          filename: `${eSignDocument.ESignDocumentName}.pdf`,
          path: signedDocumentFileUrl,
          contentType: "application/pdf",
          encoding: "base64",
        },
      ],
    });

    const isAllSigned = totalSignedReceiverCount === totalReceiverCount;
    console.log(isAllSigned, "eSignCreatedBy.UserEmail");

    if (isAllSigned) {
      await ESignRequest.update(
        {
          Status: "Completed",
        },
        {
          where: {
            ESignRequestID,
            ESignDocumentID: eSignDocument.ESignDocumentID,
          },
          transaction: t,
        }
      );

      const allSignedDocuments = await ESignActivity.findAll({
        where: {
          ESignRequestID,
        },
        attributes: ["ESignReceiverID", "SignedDocumentURL"],
        include: [
          {
            model: ESignReceiver,
            attributes: ["UserName"],
          },
        ],
        transaction: t,
      });

      if (allSignedDocuments?.length > 0) {
        const signedDocuments = allSignedDocuments.map((doc) => ({
          filename: `${doc?.ESignReceiver?.UserName}_${eSignDocument?.ESignDocumentName}.pdf`,
          path: doc.SignedDocumentURL,
          contentType: "application/pdf",
          encoding: "base64",
        }));

        await eSignMailService({
          recipientEmail: eSignCreatedBy.UserEmail,
          subject: `${eSignDocument.ESignDocumentName} Document Signed`,
          body: {
            html: emailBody,
          },
          ccEmails: helper.formatEmailList(cc),
          attachments: signedDocuments,
        });
      }
    }

    await t.commit();
    res.status(200).send({
      message: "Document Signed Successfully",
      data: null,
    });
  } catch (error) {
    await t.rollback();
    console.log(error);
    if (pathToRemove) {
      try {
        await helper.deleteFile(pathToRemove);
      } catch (error) {
        logger.error({
          message: error?.message,
          details: error?.message,
          stack: error?.stack,
          ReceiverId: ESignReceiverID,
        });
      }
    }

    logger.error({
      message: error.message,
      details: error.message,
      stack: error.stack,
      ReceiverId: ESignReceiverID,
    });

    res.status(500).send({
      error: "Something went wrong!",
    });
  }
};

exports.verifyGeneratedTokenForDynamicForm = async (req, res, next) => {
  const t = await sequelize.transaction();

  const { token, cb = null } = req.body;
  let currentUserId = null;

  try {
    let verifiedToken = null;
    try {
      verifiedToken = jwt.verify(token, process.env.DYNAMIC_FORM_SECRET_KEY);
    } catch (error) {
      await t.rollback();
      return res.status(401).json({ message: "Your token has been expired" });
    }

    if (!verifiedToken) {
      await t.rollback();
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    const decryptedTokenPayload = helper.decryptPayload({
      iv: verifiedToken.iv,
      encryptedData: verifiedToken.encryptedData,
    });
    console.log(cb, decryptedTokenPayload);
    if (!cb) {
      const getResourceAccess = await ResourceAccess.findOne({
        where: {
          ResourceID: decryptedTokenPayload.FormModuleDraftID,
          AccessToken: token,
        },
        transaction: t,
      });

      if (!getResourceAccess) {
        await t.rollback();
        return res.status(401).json({
          message: "Form is Expired",
        });
      }

      if (decryptedTokenPayload?.OtherData?.IsCampaign) {
        await ResourceAccess.update(
          {
            IsAccessed: true,
            AccessCount: getResourceAccess.AccessCount + 1,
            AccessedBy: null,
          },
          {
            where: {
              ResourceID: decryptedTokenPayload.FormModuleDraftID,
              AccessToken: token,
            },
            transaction: t,
          }
        );

        await t.commit();
        return res.status(200).json({
          message: "Verified successfully",
          data: {
            FormModuleDraftID: decryptedTokenPayload?.FormModuleDraftID,
            OtherData: decryptedTokenPayload?.OtherData,
          },
        });
      } else {
        currentUserId = decryptedTokenPayload.UserID;

        if (
          getResourceAccess.IsAccessed &&
          getResourceAccess.AccessCount >= getResourceAccess.AccessLimit
        ) {
          await t.rollback();
          return res.status(401).json({
            message: "Access limit exceeded",
          });
        } else {
          await ResourceAccess.update(
            {
              IsAccessed: true,
              AccessCount: getResourceAccess.AccessCount + 1,
              AccessedBy: decryptedTokenPayload.UserID,
            },
            {
              where: {
                ResourceID: decryptedTokenPayload.FormModuleDraftID,
                AccessToken: token,
              },
              transaction: t,
            }
          );
        }
      }
    }
    await t.commit();
    return res.status(200).json({
      message: "Verified successfully",
      data: {
        AccessToken: decryptedTokenPayload?.AccessToken,
        FormModuleDraftID: decryptedTokenPayload?.FormModuleDraftID,
        UserModuleLinkID: decryptedTokenPayload?.UserModuleLinkID,
        OtherData: decryptedTokenPayload?.OtherData,
      },
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      userId: currentUserId,
    });
    return res.status(500).json({ message: "Something went wrong" });
  }
};

exports.viewForm = async (req, res, next) => {
  const { FormModuleDraftID } = req.body;

  try {
    const formBuilderData = await FormModuleDraft.findOne({
      where: { FormModuleDraftID, IsDeleted: false },
      attributes: ["FormID"],
      include: [
        {
          model: FormModule,
          required: true,
          IsDeleted: false,
          attributes: ["FormJSON"],
        },
      ],
    });

    return res.status(200).json({
      message: "Form fetched successfully",
      data: {
        formBuilderData: formBuilderData?.FormModule?.FormJSON,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

exports.getCampaignSubmittedForm = async (req, res, next) => {
  const {
    FormModuleDraftID,
    CampaignID,
    FirstName,
    LastName,
    UnitCode,
    MobileNumber,
    Email,
  } = req.body;

  try {
    const submittedForm = await CampaignParticipant.findOne({
      where: {
        CampaignID,
        FirstName,
        LastName,
        UnitCode,
        MobileNumber,
        Email,
        Status: "Submitted",
      },
      include: [
        {
          model: Campaign,
          required: true,
          where: {
            FormModuleDraftID: FormModuleDraftID,
          },
          include: [
            {
              model: FormModule,
              required: true,
              attributes: ["FormID", "FormJSON"],
            },
          ],
        },
      ],
      attributes: ["CampaignParticipantID", "FormJSON"],
    });

    if (!submittedForm) {
      return res.status(404).json({ message: "No submitted form found" });
    }

    return res.status(200).json({
      message: "Submitted Form fetched successfully",
      data: {
        submittedForm: submittedForm?.FormJSON || null,
        formBuilderData: submittedForm?.Campaign?.FormModule?.FormJSON || null,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

exports.fillCampaign = async (req, res, next) => {
  const t = await sequelize.transaction();

  const {
    FormAnswerData,
    CampaignID,
    FirstName,
    LastName,
    UnitCode,
    MobileNumber,
    Email,
  } = req.body;

  try {
    if (!FormAnswerData) {
      await t.rollback();
      return res.status(400).json({ message: "Form answer is required" });
    }

    await CampaignParticipant.update(
      {
        FormJSON: FormAnswerData,
        Status: "Submitted",
      },
      {
        where: {
          CampaignID,
          FirstName,
          LastName,
          UnitCode,
          MobileNumber,
          Email,
        },
        transaction: t,
      }
    );

    await t.commit();
    return res.status(200).json({
      message: "Form submitted successfully",
    });
  } catch (error) {
    console.log(error);
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
    });
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

// const axios = require('axios');
// const fs = require('fs');
// const path = require('path');
// const sequelize = require('../config/database'); // Adjust path if needed
// const { DocumentModule, DocumentModuleDraft } = require('../models'); // Adjust import if needed

async function loadDocxBuffer(pathOrUrl) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const res = await axios.get(pathOrUrl, { responseType: "arraybuffer" });
    return Buffer.from(res.data);
  } else {
    return fs.readFileSync(pathOrUrl);
  }
}

async function extractReviewStatus(pathOrUrl) {
  const buffer = await loadDocxBuffer(pathOrUrl);
  const zip = await unzipper.Open.buffer(buffer);

  const commentsEntry = zip.files.find((f) => f.path === "word/comments.xml");
  const extEntry = zip.files.find((f) => f.path === "word/commentsExtended.xml");
  const docEntry = zip.files.find((f) => f.path === "word/document.xml");

  const parser = new xml2js.Parser({ explicitArray: false });

  // --- COMMENTS ---
  let allCommentsResolved = true;
  if (commentsEntry) {
    if (extEntry) {
      const extXml = (await extEntry.buffer()).toString();
      const extObj = await parser.parseStringPromise(extXml);
      let extArr = extObj?.["w15:commentsEx"]?.["w15:commentEx"];
      if (extArr && !Array.isArray(extArr)) extArr = [extArr];
      if (extArr) {
        extArr.forEach((ex) => {
          if (ex?.$?.["w15:done"] !== "1") allCommentsResolved = false;
        });
      } else {
        allCommentsResolved = false;
      }
    } else {
      allCommentsResolved = false;
    }
  }

  // --- TRACK CHANGES ---
  let allChangesHandled = true;
  if (docEntry) {
    const docXml = (await docEntry.buffer()).toString();
    const docObj = await parser.parseStringPromise(docXml);

    // Extract visible text from a node
    function extractVisibleText(node) {
      if (node == null) return "";
      if (typeof node === "string") return node;

      let out = "";

      if (typeof node === "object") {
        for (const [k, v] of Object.entries(node)) {
          if (k === "w:t") {
            if (Array.isArray(v)) {
              v.forEach(vv => {
                if (typeof vv === "string") out += vv;
                else if (vv && typeof vv === "object" && "_" in vv) out += String(vv._);
              });
            } else if (typeof v === "string") {
              out += v;
            } else if (v && typeof v === "object" && "_" in v) {
              out += String(v._);
            }
          } else if (k === "w:tab" || k === "w:br" || k === "w:cr") {
            out += " ";
          } else if (k === "w:noBreakHyphen") {
            out += "-";
          } else if (Array.isArray(v)) {
            v.forEach(vv => out += extractVisibleText(vv));
          } else if (typeof v === "object") {
            out += extractVisibleText(v);
          }
        }
      }

      return out;
    }

    // NEW: Aggressive filter for space-only changes
    function shouldIgnoreChange(changeNode) {
      if (!changeNode || typeof changeNode !== "object") return false;

      // Extract text content
      const visibleText = extractVisibleText(changeNode);
      const normalizedText = visibleText.replace(/\u00A0/g, " ").trim();

      // If it's empty or only whitespace, it's definitely trivial
      if (normalizedText === "") {
        return true;
      }

      // If it's only a single space or similar trivial whitespace change
      if (normalizedText === " " || normalizedText === "  " || normalizedText === "   ") {
        return true;
      }

      // Check if this change contains only basic formatting elements
      return containsOnlyBasicElements(changeNode);
    }

    // Check if the change contains only basic formatting/runs without real content
    function containsOnlyBasicElements(node) {
      if (!node || typeof node !== "object") return true;

      const basicElements = [
        "w:r", "w:p", "w:rPr", "w:pPr", "w:t", "w:tab", "w:br", "w:cr", "w:noBreakHyphen",
        "w:rFonts", "w:sz", "w:color", "w:highlight", "w:u", "w:i", "w:b",
        "w:vertAlign", "w:lang", "w:jc", "w:spacing", "w:ind", "w:pStyle",
        "w:rStyle", "w:szCs", "w:bCs", "w:iCs", "w:caps", "w:smallCaps",
        "w:strike", "w:dstrike", "w:outline", "w:shadow", "w:emboss",
        "w:imprint", "w:noProof", "w:snapToGrid", "w:vanish", "w:webHidden",
        "w:fitText", "w:rtl", "w:cs", "w:specVanish", "w:oMath"
      ];

      let hasNonBasicElement = false;

      function checkElements(n) {
        if (!n || typeof n !== "object" || hasNonBasicElement) return;

        for (const [key, value] of Object.entries(n)) {
          // If we find any element that's not in our basic list, mark it
          if (key.startsWith("w:") && !basicElements.includes(key)) {
            hasNonBasicElement = true;
            return;
          }

          // Recursively check children
          if (Array.isArray(value)) {
            value.forEach(checkElements);
          } else if (typeof value === "object") {
            checkElements(value);
          }
        }
      }

      checkElements(node);
      return !hasNonBasicElement;
    }

    // Track all changes for analysis
    const allChanges = [];

    function scanForChanges(node) {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(scanForChanges);
        return;
      }
      if (typeof node !== "object") return;

      const changeTypes = ["w:ins", "w:del", "w:moveFrom", "w:moveTo"];
      for (const type of changeTypes) {
        const change = node[type];
        if (!change) continue;

        const changesArray = Array.isArray(change) ? change : [change];

        for (const c of changesArray) {
          const changeInfo = {
            type: type,
            node: c,
            shouldIgnore: shouldIgnoreChange(c),
            text: extractVisibleText(c),
            textLength: extractVisibleText(c).length
          };

          allChanges.push(changeInfo);

          if (!changeInfo.shouldIgnore) {
            console.log("Detected meaningful change:", {
              type: type,
              text: JSON.stringify(changeInfo.text),
              length: changeInfo.textLength
            });
            allChangesHandled = false;
          } else {
            console.log("Ignoring trivial change:", {
              type: type,
              text: JSON.stringify(changeInfo.text),
              length: changeInfo.textLength
            });
          }
        }
      }

      for (const value of Object.values(node)) {
        scanForChanges(value);
      }
    }

    const body = docObj?.["w:document"]?.["w:body"];
    scanForChanges(body);

    console.log("Total changes found:", allChanges.length);
    console.log("Meaningful changes:", allChanges.filter(c => !c.shouldIgnore).length);
  }

  console.log({ allCommentsResolved, allChangesHandled }, "resolved");
  return allCommentsResolved && allChangesHandled;
}


async function convertWithOnlyOffice(inputUrl, outputPath) {
  try {
    // Build request body for ONLYOFFICE ConvertService
    const body = {
      async: false, // wait until conversion finishes
      filetype: "docx", // input file type
      outputtype: "pdf", // desired output
      key: `${Date.now()}`, // unique key for this conversion
      title: path.basename(inputUrl),
      url: inputUrl, // DOCX file URL accessible by DocumentServer
    };

    // Send request to ONLYOFFICE DocumentServer
    const response = await axios.post(
      `${process.env.ONLYOFFICE_SERVER_URL}/ConvertService.ashx`, // replace localhost if running elsewhere
      body,
      { headers: { "Content-Type": "application/json" } }
    );

    if (!response.data || !response.data.fileUrl) {
      throw new Error("Conversion failed: No fileUrl returned.");
    }

    const pdfUrl = response.data.fileUrl;
    console.log("✅ PDF Generated:", pdfUrl);

    // Download the converted PDF
    const pdfResponse = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
    });
    fs.writeFileSync(outputPath, pdfResponse.data);

    console.log(`📂 PDF saved to: ${outputPath}`);
  } catch (err) {
    console.error("❌ Error converting with ONLYOFFICE:", err.message);
  }
}

exports.updateEditedDocumentPath = async (req, res, next) => {
  const t = await sequelize.transaction();
  const { url, key, notmodified } = req.body;
  const basePath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "Document"
  );
  const allowedFileTypes = [".docx", ".doc"];
  const UserID = req?.body?.actions[0]?.userid;
  try {
    if (url && !notmodified) {
      await DocumentModuleDraft.update({ OnlyOfficeResponceUrl: url }, { where: { DocumentModuleDraftID: key } })
      const status = await extractReviewStatus(url);
      if (!status) {
        throw new Error(
          "Please resolve all comments and changes before saving the document."
        );
      }
      // Find and update the latest document in DocumentModuleDraft
      const latestDocumentDraft = await DocumentModuleDraft.findOne({
        where: { DocumentModuleDraftID: key },
        attributes: [
          "ModuleTypeID",
          "ContentID",
          "DocumentModuleDraftID",
          "DocumentID",
          "DocumentPath",
          "AllowFileChanges",
          "DocumentStatus",
        ],
      });

      if (
        latestDocumentDraft &&
        latestDocumentDraft?.DocumentStatus === "Published"
      ) {
        // Extract file extension
        // if (latestDocumentDraft?.AllowFileChanges === false) {
        //   throw new Error("File changes are not allowed for this document");
        // }
        if (!UserID) {
          throw new Error("No User Id Found!!");
        }

        const fileExtension = path.extname(url);

        if (!allowedFileTypes.includes(fileExtension)) {
          throw new Error("Invalid file");
        }

        // Define file paths
        // const currentDateTimeAMPM = Date.now();
        const fileNameForDraft = `${key}${fileExtension}`; // e.g., 6a9ea09d-2e33-40ca-80d9-fb77e0ad5503.docx
        const fileNameForModule = `${latestDocumentDraft.DocumentID}${fileExtension}`; // e.g., 6a9ea09d-2e33-40ca-80d9-fb77e0ad5503.docx
        const outputDraftPath = path.posix.join(basePath, fileNameForDraft);
        const outputModulePath = path.posix.join(basePath, fileNameForModule);
        const pdfDraftPath = outputDraftPath.replace(".docx", ".pdf");
        const pdfModulePath = outputModulePath.replace(".docx", ".pdf");
        try {
          // Download and save the file
          const response = await axios({
            method: "GET",
            url: url,
            responseType: "arraybuffer",
          });

          // if (!fs.existsSync(outputPath)) {
          //   fs.mkdirSync(outputPath, { recursive: true });
          // }

          fs.writeFileSync(outputDraftPath, response?.data);
          fs.writeFileSync(outputModulePath, response?.data);
          // Convert to PDF using ONLYOFFICE
          await convertWithOnlyOffice(url, pdfDraftPath);
          await convertWithOnlyOffice(url, pdfModulePath);
        } catch (error) {
          throw error;
        }

        const queries = [];

        const documentDraftUpdateQuery = latestDocumentDraft.update(
          {
            DocumentPath: pdfDraftPath,
            EditedDocumentPath: outputDraftPath,
            AllowFileChanges: false,
            ModifiedBy: UserID,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
          },
          { transaction: t }
        );

        // Update EditedDocumentPath in DocumentModule
        const documentUpdateQuery = DocumentModule.update(
          {
            DocumentPath: pdfModulePath,
            DocumentEditedPath: outputModulePath,
            ModifiedBy: UserID,
            ModifiedDate: literal("CURRENT_TIMESTAMP"),
          },
          {
            where: { DocumentID: latestDocumentDraft?.DocumentID },
            transaction: t,
          }
        );

        const editedDocumentVersionQuery = EditedDocumentVersion.create(
          {
            ModuleTypeID: latestDocumentDraft?.ModuleTypeID,
            ContentID: latestDocumentDraft?.ContentID,
            DocumentModuleDraftID: latestDocumentDraft?.DocumentModuleDraftID,
            DocumentEditedPath: outputDraftPath,
            DocumentID: latestDocumentDraft?.DocumentID,
            UserID: UserID,
            CreatedBy: UserID,
          },
          {
            transaction: t,
          }
        );

        queries.push(
          documentDraftUpdateQuery,
          // documentUpdateQuery,
          editedDocumentVersionQuery
        );

        await Promise.all(queries);

        documentEditSuccess(UserID, "Document Edited Successfully");

        await t.commit();

        return res.status(200).json({
          error: 0,
          message: "Document saved successfully",
          // filePath: outputPath, // Return the new file path
        });
      } else {
        throw new Error("No draft found as published");
      }
    }

    await t.commit();
    return res.status(200).json({ error: 0, message: "Document Updated" });
  } catch (error) {
    documentEditFailure(UserID, "Document Edit Failed");
    console.error("Error:", error);
    await t.rollback();

    return res
      .status(500)
      .json({ error: 1, message: "Something went wrong!!" });
  }
};

exports.blankAndTemplatePathUpdate = async (req, res, next) => {
  const t = await sequelize.transaction();
  const { url, key } = req.body;
  const basePath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "Document"
  );
  const allowedFileTypes = [".docx", ".doc"];
  const UserID = req?.body?.actions?.[0]?.userid;

  try {
    if (url) {
      // Find and update the latest document in DocumentModuleDraft
      const latestDocumentDraft = await DocumentModuleDraft.findOne({
        where: { DocumentModuleDraftID: key.split("_")[0] },
        attributes: [
          "ModuleTypeID",
          "ContentID",
          "DocumentModuleDraftID",
          "DocumentID",
          "DocumentPath",
          "AllowFileChanges",
          "DocumentStatus",
        ],
      });

      if (!latestDocumentDraft) {
        throw new Error("No draft found for the provided key");
      }

      if (!UserID) {
        throw new Error("No User Id Found!!");
      }

      const fileExtension = path.extname(url);

      if (!allowedFileTypes.includes(fileExtension)) {
        throw new Error("Invalid file");
      }

      // Define file paths
      const fileNameForDraft = `${key.split("_")[0]}${fileExtension}`;
      const fileNameForModule = `${latestDocumentDraft.DocumentID}${fileExtension}`;
      const outputDraftPath = path.posix.join(basePath, fileNameForDraft);
      const outputModulePath = path.posix.join(basePath, fileNameForModule);

      try {
        // Download and save the file
        const response = await axios({
          method: "GET",
          url: url,
          responseType: "arraybuffer",
        });

        fs.writeFileSync(outputDraftPath, response?.data);
        fs.writeFileSync(outputModulePath, response?.data);
      } catch (error) {
        throw error;
      }

      const queries = [];

      const documentDraftUpdateQuery = latestDocumentDraft.update(
        {
          DocumentPath: outputDraftPath,
          AllowFileChanges: false,
          ModifiedBy: UserID,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        { transaction: t }
      );

      const editedDocumentVersionQuery = EditedDocumentVersion.create(
        {
          ModuleTypeID: latestDocumentDraft?.ModuleTypeID,
          ContentID: latestDocumentDraft?.ContentID,
          DocumentModuleDraftID: latestDocumentDraft?.DocumentModuleDraftID,
          DocumentEditedPath: outputDraftPath,
          DocumentID: latestDocumentDraft?.DocumentID,
          UserID: UserID,
          CreatedBy: UserID,
        },
        {
          transaction: t,
        }
      );

      queries.push(documentDraftUpdateQuery, editedDocumentVersionQuery);

      await Promise.all(queries);

      documentEditSuccess(UserID, "Document Edited Successfully");

      await t.commit();

      return res.status(200).json({
        error: 0,
        message: "Blank/Template document path updated successfully",
      });
    }

    await t.commit();
    return res.status(200).json({ error: 0, message: "No URL provided" });
  } catch (error) {
    documentEditFailure(UserID, "Document Edit Failed");
    await t.rollback();
    return res
      .status(500)
      .json({ error: 1, message: "Something went wrong!!" });
  }
};

exports.TemplatePathUpdate = async (req, res, next) => {
  const t = await sequelize.transaction();
  const { url, key } = req.body;
  const basePath = path.posix.join(
    "src",
    "infrastructure",
    "media",
    "Template",
    "TemplateDocument"
  );
  const allowedFileTypes = [".docx", ".doc"];
  const UserID = req?.body?.actions?.[0]?.userid;

  try {
    if (url) {
      const latestDocumentTemplate = await DocumentTemplate.findOne({
        where: { DocumentTemplateID: key.split("_")[0] },
        attributes: [
          "ModuleTypeID",
          "ContentID",
          "DocumentTemplateID",
          "DocumentPath",
        ],
      });

      if (!latestDocumentTemplate) {
        throw new Error("No Template found for the provided key");
      }

      if (!UserID) {
        throw new Error("No User Id Found!!");
      }

      const fileExtension = path.extname(url);

      if (!allowedFileTypes.includes(fileExtension)) {
        throw new Error("Invalid file");
      }

      // Define file paths
      const fileNameForTemplate = `${key.split("_")[0]}${fileExtension}`;
      const outputTemplatePath = path.posix.join(basePath, fileNameForTemplate);

      try {
        // Download and save the file
        const response = await axios({
          method: "GET",
          url: url,
          responseType: "arraybuffer",
        });

        fs.writeFileSync(outputTemplatePath, response?.data);
      } catch (error) {
        throw error;
      }

      await latestDocumentTemplate.update(
        {
          DocumentPath: outputTemplatePath,
          ModifiedBy: UserID,
          ModifiedDate: literal("CURRENT_TIMESTAMP"),
        },
        { transaction: t }
      );

      documentEditSuccess(UserID, "Template Edited Successfully");

      await t.commit();

      return res.status(200).json({
        error: 0,
        message: "Template document path updated successfully",
      });
    }

    await t.commit();
    return res.status(200).json({ error: 0, message: "No URL provided" });
  } catch (error) {
    documentEditFailure(UserID, "Template Edit Failed");
    await t.rollback();
    return res
      .status(500)
      .json({ error: 1, message: "Something went wrong!!" });
  }
};

exports.createSkillsClickEvent = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { UserId, SkillID, CorrectClick, InCorrectClick } = req.body;
    if (
      !UserId ||
      !SkillID ||
      CorrectClick === undefined ||
      InCorrectClick === undefined
    ) {
      await t.rollback();
      return res.status(400).json({
        status: false,
        message:
          "UserId, SkillID, CorrectClick, and InCorrectClick are required fields",
        data: null,
      });
    }

    // ✅ Create a new session ID
    const createSessionId = uuidv4();

    // ✅ Create the click event
    const skillsClickEvent = await SkillsClickEvent.create(
      {
        CreateSessionID: createSessionId,
        UserID: UserId,
        SkillID,
        CorrectClick,
        InCorrectClick,
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      status: true,
      message: "Skills click event created successfully",
      data: skillsClickEvent,
      createSessionId,
    });
  } catch (error) {
    await t.rollback();
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong while creating skills click event",
      data: null,
    });
  }
};
exports.getAllSkillsClickEvents = async (req, res) => {
  try {
    const { sortBy = "createdAt", sortOrder = "DESC" } = req.query;

    const events = await SkillsClickEvent.findAll({
      attributes: [
        "ClickEventID",
        "CreateSessionID",
        "UserID",
        "SkillID",
        "CorrectClick",
        "InCorrectClick",
        "createdAt",
        "updatedAt",
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    if (!events || events.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No skills click events found",
        data: [],
      });
    }

    res.status(200).json({
      status: true,
      message: "Skills click events retrieved successfully",
      data: events,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: false,
      message: "Something went wrong while fetching skills click events",
      data: null,
    });
  }
};

exports.getClickEventsBySession = async (req, res) => {
  try {
    const { CreateSessionID } = req.body;

    if (!CreateSessionID) {
      return res.status(400).json({
        status: false,
        message: "Missing CreateSessionID in request",
      });
    }

    const events = await SkillsClickEvent.findAll({
      where: { CreateSessionID },
      attributes: [
        "ClickEventID",
        "CreateSessionID",
        "UserID",
        "SkillID",
        "CorrectClick",
        "InCorrectClick",
        "createdAt",
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
    });

    if (events.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No click events found for this session",
        data: [],
      });
    }

    res.status(200).json({
      status: true,
      message: "Click events retrieved successfully",
      data: events,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: false,
      message: "Something went wrong while fetching click events",
    });
  }
};

exports.extractReview = extractReviewStatus;
