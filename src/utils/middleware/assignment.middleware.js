const OrganizationStructureModuleMasterLinks = require("../../model/OrganizationStructureModuleMasterLinks");

exports.getMasterIds = async (req,res,next) => {
    const { lincense } = req.payload;
    try {
        const moduleTypeIds = await OrganizationStructureModuleMasterLinks.findAll({
            where: {
              OrganizationStructureID: lincense?.EnterpriseID
            },
            attributes: ["ModuleTypeID"],
          })
          req.payload['OrgModuleMasterIds'] = JSON.parse(JSON.stringify(moduleTypeIds)).map(e => e.ModuleTypeID)
          next();
          } catch (error) {
            console.error(error);
            res.status(500).send({ message: "Server Error" });
          }
        }