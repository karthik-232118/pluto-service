const { sequelize } = require("../../model");
const ContentStructure = require("../../model/ContentStructure");
const DocumentModule = require("../../model/DocumentModule");
const getAccessToken = require("../../utils/services/cloudDrive");
const { logger } = require("../../utils/services/logger");
const path = require("path");
const { createWriteStream } = require("fs");
const { promisify } = require("util");
const { pipeline } = require("stream");
const { ToWords } = require("to-words");
const DocumentModuleDraft = require("../../model/DocumentModuleDraft");
const streamPipeline = promisify(pipeline);

const driveId =
  "b!-V7d5EvxKkydcNu98L1AGDDLZvgc6chIr0kYiCOLtXYE0DljdQosRLAJ3yTNPkBK";
exports.getDriveFolderAndDocumentList = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  try {
    const files = [],
      fileId = [];
    const token = await getAccessToken();
    const itemId = "01IYNFKRN6Y2GOVW7725BZO354PWSELRRZ"; // Replace with your item ID
    // Download the file and save it
    async function downloadOneDriveFile(token, itemId) {
      const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/children`;
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const responseBody = await response.json();
        for (const element of responseBody.value) {
          const parentPath =
            element.parentReference.path.split("root:")[1] || "";
          if (element.folder) {
            await downloadOneDriveFile(token, element.id);
          } else if (element.name.includes(".pdf")) {
            files.push({
              name: element.name,
              id: element.id,
              folderPath: parentPath,
            });
            fileId.push(element.id);
          }
        }
      } catch (error) {
        throw new Error("Error: " + error.message);
      }
    }
    await downloadOneDriveFile(token, itemId);
    const document = await sequelize.query(
      `select dm."DriveID" from "DocumentModules" dm 
            inner join "ContentStructures" cs on cs."ContentID" = dm."ContentID" 
            where cs."OrganizationStructureID" = :OrganizationStructureID and cs."DriveID" in (:DriveID)`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: {
          DriveID: fileId,
          OrganizationStructureID: lincense?.EnterpriseID,
        },
      }
    );
    for (const file of files) {
      file.isExists = false;
      for (const doc of document) {
        if (file.id === doc.DriveID) {
          file.isExists = true;
        }
      }
    }
    res.status(200).json({ data: files });
  } catch (error) {
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
exports.updateDriveFolderAndDocuments = async (req, res) => {
  const { currentUserId, lincense } = req.payload;
  const t = await sequelize.transaction();
  try {
    const { ContentID, ModuleTypeID } = req.body;
    if (!ModuleTypeID) {
      res.status(404).json({ message: "ModuleTypeID is required" });
    }
    const files = [],
      folder = [];
    const token = await getAccessToken();
    const itemId = "01IYNFKRN6Y2GOVW7725BZO354PWSELRRZ"; // Replace with your item ID
    // Download the file and save it
    async function downloadOneDriveFile(token, itemId) {
      const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/children`;
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const responseBody = await response.json();
        for (const element of responseBody.value) {
          const parentPath =
            element.parentReference.path.split("root:")[1] || "";
          if (element.folder) {
            folder.push({
              name: element.name,
              id: element.id,
              folderPath: parentPath,
              folderId: element.parentReference.id,
            });
            await downloadOneDriveFile(token, element.id);
          } else if (element.name.includes(".pdf")) {
            files.push({
              name: element.name,
              id: element.id,
              folderPath: parentPath,
              folderId: element.parentReference.id,
              downloadUrl: element["@microsoft.graph.downloadUrl"],
            });
          }
        }
      } catch (error) {
        throw new Error("Error: " + error.message);
      }
    }
    await downloadOneDriveFile(token, itemId);
    if (ContentID) {
      const exist = await ContentStructure.count({
        where: {
          DriveID: itemId,
          OrganizationStructureID: lincense?.EnterpriseID,
        },
      });
      if (!exist) {
        await ContentStructure.update(
          {
            DriveID: itemId,
          },
          {
            where: {
              ContentID,
            },
          },
          { transaction: t }
        );
      }
      for (const el of folder) {
        if (el.folderId == itemId) {
          const exist = await ContentStructure.count({
            where: {
              DriveID: el.id,
              OrganizationStructureID: lincense?.EnterpriseID,
            },
          });
          if (!exist) {
            await ContentStructure.create(
              {
                ParentContentID: ContentID,
                ContentName: el.name,
                DriveID: el.id,
                ModuleTypeID,
                OrganizationStructureID: lincense?.EnterpriseID,
              },
              { transaction: t }
            );
          }
        }
      }
    }

    // const category = await ContentStructure.findAll({
    //     where: {
    //         DriveID: [...folderId, itemId],
    //         OrganizationStructureID: lincense?.EnterpriseID
    //     },
    //     attributes: ['ContentID', 'ContentName', 'DriveID']
    // }, { transaction: t });
    // if(!category.some((x) => x.DriveID === itemId)){
    //     await ContentStructure.update({
    //         DriveID: itemId,
    //     },{
    //         where: {
    //             ContentID
    //         }
    //     }, { transaction: t });
    // }
    // const { ModuleTypeID } = await ContentStructure.findByPk(ContentID, {
    //     attributes: ['ModuleTypeID', 'ContentName']
    // }, { transaction: t })
    // const document = await sequelize.query(
    //     `select dm."DocumentID",dm."DocumentName",dm."DriveID" from "DocumentModules" dm
    //     inner join "ContentStructures" cs on cs."ContentID" = dm."ContentID"
    //     where cs."OrganizationStructureID" = :OrganizationStructureID and cs."DriveID" in (:DriveID)`
    //     , {
    //         type: sequelize.QueryTypes.SELECT,
    //         replacements: {
    //             DriveID: fileId,
    //             OrganizationStructureID: lincense?.EnterpriseID
    //         }, transaction: t
    //     });

    // for (const element of folder) {
    //     const exist = category.some((x) => x.DriveID === element.id);
    //     if (!exist) {
    //         await ContentStructure.create({
    //             ContentName: element.name,
    //             DriveID: element.id,
    //             ModuleTypeID,
    //             OrganizationStructureID: lincense?.EnterpriseID,
    //             CreatedBy: currentUserId
    //         }, { transaction: t });
    //     }
    // }
    // for (const file of files) {
    //     file.isExists = false;
    //     for (const doc of document) {
    //         if (file.id === doc.DriveID) {
    //             file.isExists = true;
    //         }
    //     }
    //     if (!file.isExists) {
    //         const count = await DocumentModule.count({
    //             where: {
    //                 DocumentName: path.parse(file.name).name
    //             }
    //         }, { transaction: t });
    //         let docName = path.parse(file.name).name;
    //         if (count > 0) {
    //             const toWords = new ToWords();
    //             docName = `${path.parse(file.name).name} ${toWords(count + 1)}`;
    //         }
    //         const cs = await ContentStructure.findOne({
    //             where: {
    //                 DriveID: file.folderId,
    //                 OrganizationStructureID: lincense?.EnterpriseID
    //             },
    //             attributes: ['ContentID', 'ContentName', 'DriveID']
    //         }, { transaction: t })
    //         console.log(cs)
    //         const documentModule = await DocumentModule.create({
    //             ContentID: cs._model.ContentID,
    //             DocumentName: docName,
    //             DriveID: file.id,
    //             ModuleTypeID,
    //             DocumentStatus: 'Approved',
    //             DocumentIsActive: true,
    //             MasterVersion: '1.0',
    //             SelfApproved: true,
    //             CreatedBy: currentUserId
    //         }, { transaction: t, returning: true });
    //         await DocumentModuleDraft.create({
    //             DocumentID: documentModule.DocumentID,
    //             ContentID: cs._model.ContentID,
    //             DocumentName: docName,
    //             DriveID: file.id,
    //             ModuleTypeID,
    //             DocumentStatus: 'Approved',
    //             DocumentIsActive: true,
    //             MasterVersion: '1.0',
    //             SelfApproved: true,
    //             DraftVersion: '0.1',
    //             DocumentPath: documentModule.DocumentPath,
    //             CreatedBy: currentUserId
    //         }, { transaction: t });

    //         const fileStream = createWriteStream('./src/infrastructure/media/Document/' +
    //             documentModule.DocumentID + '.pdf');
    //         const downloadData = await fetch(file.downloadUrl);
    //         await streamPipeline(downloadData.body, fileStream);
    //     }
    // }
    await t.commit();
    res
      .status(200)
      .json({
        message: "Updated Category and Elements from OneDrive",
        folder,
        files,
      });
  } catch (error) {
    await t.rollback();
    logger.error({
      message: error.message,
      details: error,
      UserID: currentUserId,
    });
    res.status(400).send({
      error: error.errors?.[0]?.message
        ? error.errors?.[0]?.message
        : error.message,
    });
  }
};
