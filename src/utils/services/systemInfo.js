const os = require("os");
const dns = require('dns');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const execAsync = promisify(exec);
exports.getSystemInfo = async () => {
    let hostname = os.hostname();
    let machineId = null;
    let hddSerial = null;
    let osSerial = null;
    const macInterfaces = {};
    const platform = os.platform();

    async function getHardwareIdentifier() {
        try {
            let command, identifier, cpuId, machineUuid;

            // Platform-specific logic
            switch (platform) {
                case 'win32': // Windows
                    // Fetch CPU ID (ProcessorId) and Machine UUID (from BIOS)
                    const cpuCommand = 'wmic cpu get ProcessorId';
                    const uuidCommand = 'wmic csproduct get uuid';

                    const [cpuResult, uuidResult] = await Promise.all([
                        execAsync(cpuCommand),
                        execAsync(uuidCommand),
                    ]);

                    cpuId = cpuResult.stdout
                        .split('\n')[1]
                        .trim();

                    machineUuid = uuidResult.stdout
                        .split('\n')[1]
                        .trim();

                    return { CPUID: cpuId, MachineUUID: machineUuid };

                case 'linux': // Linux
                    // Read CPU ID (from /proc/cpuinfo) and Machine UUID (from /sys)
                    const cpuInfo = await fs.readFile('/proc/cpuinfo', 'utf8');
                    const cpuLine = cpuInfo.split('\n').find(line => line.includes('cpu family'));
                    cpuId = cpuLine ? cpuLine.split(':')[1].trim() : 'N/A';

                    machineUuid = await fs.readFile('/sys/class/dmi/id/product_uuid', 'utf8');
                    return { CPUID: cpuId, MachineUUID: machineUuid.trim() };

                case 'darwin': // macOS
                    // Fetch Machine UUID (IOPlatformUUID)
                    const { stdout } = await execAsync('ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID');
                    const match = stdout.match(/"IOPlatformUUID" = "([\w-]+)"/);
                    machineUuid = match ? match[1] : 'N/A';

                    // macOS CPU ID (not commonly available; returns N/A)
                    return { CPUID: 'N/A', MachineUUID: machineUuid };

                default:
                    throw new Error('Unsupported OS');
            }
        } catch (error) {
            console.error(`Error: ${error.message}`);
            return { CPUID: 'N/A', MachineUUID: 'N/A' };
        }
    }
    try {
        machineId = await getHardwareIdentifier();
    } catch (error) { }

    function executeCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) reject(error);
                else if (stderr) reject(stderr);
                else resolve(stdout);
            });
        });
    }
    async function getDriveSerial() {

        try {
            let command;
            if (platform === 'win32') {
                // Windows (WMIC)
                command = 'wmic diskdrive get serialnumber';
                const stdout = await executeCommand(command);
                const serial = stdout.split('\n')[1].trim();
                return serial || "Serial not found (Windows)";
            }
            else if (platform === 'linux') {
                // Linux (hdparm)
                command = 'sudo hdparm -I /dev/sda | grep "Serial Number"';
                const stdout = await executeCommand(command);
                const serial = stdout.split(':')[1]?.trim();
                return serial || "Serial not found (Linux)";
            }
            else if (platform === 'darwin') {
                // macOS (system_profiler)
                command = 'system_profiler SPSerialATADataType | grep "Serial Number"';
                const stdout = await executeCommand(command);
                const serial = stdout.split(':')[1]?.trim();
                return serial || "Serial not found (macOS)";
            }
            else {
                throw new Error(`Unsupported OS: ${platform}`);
            }
        } catch (error) {
            console.error('Error fetching drive serial:', error.message);
            return "Error: " + error.message;
        }
    }
    async function getOSSerialNumber() {

        try {
            let command;
            if (platform === 'win32') {
                // Windows (WMIC BIOS UUID)
                command = 'wmic csproduct get uuid';
                const stdout = await executeCommand(command);
                const uuid = stdout.split('\n')[1].trim();
                return uuid || "UUID not found (Windows)";
            }
            else if (platform === 'linux') {
                // Linux (dmidecode or /sys/class/dmi/id)
                command = 'sudo dmidecode -s system-uuid || cat /sys/class/dmi/id/product_uuid';
                const stdout = await executeCommand(command);
                const uuid = stdout.trim();
                return uuid || "UUID not found (Linux)";
            }
            else if (platform === 'darwin') {
                // macOS (ioreg)
                command = 'ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID';
                const stdout = await executeCommand(command);
                const uuid = stdout.split('=')[1]?.trim().replace(/"/g, '');
                return uuid || "UUID not found (macOS)";
            }
            else {
                throw new Error(`Unsupported OS: ${platform}`);
            }
        } catch (error) {
            console.error('Error fetching OS serial:', error.message);
            return "Error: " + error.message;
        }
    }
    try {
        hddSerial = await getDriveSerial();
    } catch (error) { }
    try {
        osSerial = await getOSSerialNumber();
    } catch (error) { }
    try {
        const interfaces = os.networkInterfaces();
        for (const [key, value] of Object.entries(interfaces)) {
            for (const iface of value) {
                if (iface.mac && iface.mac !== "00:00:00:00:00:00") {
                    if (typeof macInterfaces[key] === "undefined") {
                        macInterfaces[key] = [];
                    }
                    macInterfaces[key].push(iface.mac);
                }
            }
        }
        for (const [key, value] of Object.entries(macInterfaces)) {
            macInterfaces[key] = [...new Set(value)];
        }
    } catch (error) {

    }
    return {
        hostname: hostname,
        macInterfaces: macInterfaces,
        machineId: machineId,
        hddSerial: hddSerial,
        osSerial: osSerial
    }
}