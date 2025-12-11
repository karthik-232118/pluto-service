const SticherLicense = require("../../model/SticherLicense");
const SticherLincencesClients = require("../../model/SticherLincencesClients");
const { encryptedData } = require("../../utils/services/encription");

exports.addSticherClientDetails = async (req, res) => {
    const { ClientID, ClientName, UniqueKey, Description, Email,
        MacInterFaces, HostName, MachineUUID, DriveSerialNumber, OSSerialNumber
    } = req.body;
    try {
        await SticherLincencesClients.create({
            ClientID,
            ClientName,
            Description,
            Email,
            UniqueKey,
            MacInterFaces,
            HostName,
            MachineUUID,
            DriveSerialNumber,
            OSSerialNumber,
            CreatedBy: req.payload.currentUserId
        })
        res.status(200).send({
            success: true,
            message: "Client details added successfully"
        });
    } catch (error) {
        console.error("Error adding client details:", error);
        res.status(500).send({
            success: false,
            message: "Failed to add client details"
        });
    }
}

exports.addSticherLicenseDetails = async (req, res) => {
    const {
        ClientID,
        NumberOfEndUsers,
        PerpetualEndUser,
        NumberOfRecordings,
        PerpetualRecordings,
        NumberOfSticher,
        PerpetualSticher,
        NumberOfAdminUsers,
        ValidityFrom,
        ValidityTo,
        Module = 'All',
        IsExtendedLicense
    } = req.body;

    try {
        const client = await SticherLincencesClients.findOne({
            where: { ClientID, IsActive: true, IsDeleted: false },
            order: [['CreatedDate', 'DESC']],
        });
        if (!client) {
            return res.status(404).send({
                success: false,
                message: "Client not found"
            });
        }
        const {
            ClientName,
            UniqueKey,
            MacInterFaces,
            HostName,
            MachineUUID,
            DriveSerialNumber,
            OSSerialNumber
        } = client;
        const payload = {
            ClientID,
            ClientName,
            NumberOfEndUsers,
            PerpetualEndUser,
            NumberOfRecordings,
            PerpetualRecordings,
            NumberOfSticher,
            PerpetualSticher,
            NumberOfAdminUsers,
            ValidityFrom,
            ValidityTo: new Date(
                new Date(ValidityTo).setHours(23, 59, 59)
            ).toISOString(),
            Module,
            IsExtendedLicense,
            MacInterFaces,
            HostName,
            MachineUUID,
            DriveSerialNumber,
            OSSerialNumber
        };
        const EncriptedLicenseKey = encryptedData(
            JSON.stringify({ ...payload, UniqueKey })
        );
        await SticherLicense.create({
            LicenseKey: EncriptedLicenseKey,
            ...payload,
            CreatedBy: req.payload.currentUserId
        });
        res.status(200).send({
            success: true,
            LicenseKey: EncriptedLicenseKey,
            message: "License details added successfully"
        });
    } catch (error) {
        console.error("Error adding license details:", error);
        res.status(500).send({
            success: false,
            message: "Failed to add license details"
        });
    }
}
exports.getSticherClientDetailWithLicense = async (req, res) => {
    try {
        const clients = await SticherLincencesClients.findAll({
            where: { IsActive: true, IsDeleted: false },
            attributes: ['ClientID', 'ClientName', 'UniqueKey'],
            include: [{
                model: SticherLicense,
                as: 'SticherLicenses',
                where: { IsActive: true, IsDeleted: false },
                attributes: {
                    exclude: ['ModifiedBy', 'ModifiedDate', 'IsDeleted', 'DeletedBy', 'DeletedDate']
                },
                required: false
            }]
        });
        res.status(200).send({
            success: true,
            data: clients
        });
    } catch (error) {
        console.error("Error fetching client details:", error);
        res.status(500).send({
            success: false,
            message: "Failed to fetch client details"
        });
    }
}