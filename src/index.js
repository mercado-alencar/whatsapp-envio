const {
    Client, Location
} = require('whatsapp-web.js');
const fs = require('fs');

const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

const client = new Client({ puppeteer: { headless: false }, session: sessionCfg });
// You can use an existing session and avoid scanning a QR code by adding a "session" object to the client options.
// This object must include WABrowserId, WASecretBundle, WAToken1 and WAToken2.

client.initialize();

client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED', qr);
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
    console.log('READY');
});

const sendTo = async (msg) => {
    // Direct send a new message to specific id
    let number = msg.body.split(' ')[1];
    let messageIndex = msg.body.indexOf(number) + number.length;
    let message = msg.body.slice(messageIndex, msg.body.length);
    number = number.includes('@c.us') ? number : `${number}@c.us`;
    let chat = await msg.getChat();
    chat.sendSeen();
    client.sendMessage(number, message);
}

const listChats = async (msg) => {
    const chats = await client.getChats();
    const contacts = Promise.all(chats.map(async (c) => {
        let contact = await c.getContact();
        if (!contact.isGroup) {
            let result = { name: contact.name || contact.pushname, number: contact.number };
            return result;
        }
    }));
    contacts.then(data => {
        var result = data.filter(a => a && a.name);
        client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
        client.sendMessage(msg.from, `the chats ${JSON.stringify(result)}`);
        fs.writeFile("chats.json", JSON.stringify(result), function (err) {
            if (err) {
                console.error(err);
            }
        });
    })
}
const listNotContacts = async (msg) => {
    const chats = await client.getChats();
    const contacts = Promise.all(chats.map(async (c) => {
        let contact = await c.getContact();
        if (!contact.isGroup && !contact.isMyContact) {
            let result = { name: contact.name || contact.pushname, number: contact.number };
            return result;
        }
    }));
    contacts.then(data => {
        var result = data.filter(a => a && a.name);
        client.sendMessage(msg.from, `The bot has ${contacts.length} chats not contacts.`);
        client.sendMessage(msg.from, `the chats ${JSON.stringify(result)}`);
        fs.writeFile("chats.json", JSON.stringify(result), function (err) {
            if (err) {
                console.error(err);
            }
        });
    })
}

client.on('message', async msg => {
    //   console.log('MESSAGE RECEIVED', msg);
    if (msg.body === '!send') {
        console.log(msg.from)
        var numbers = ['556784492149@c.us', '556699442424@c.us'];
        numbers.forEach(to => {
            console.log(to)
            client.sendMessage(to, 'Boa Tarde');

        });

    } else if (msg.body.startsWith('!sendto ')) {
        sendTo(msg);

    } else if (msg.body === '!chats') {
        listChats(msg);

    }
    else if(msg.body === '!not') {
            listNotContacts(msg);
    }else if (msg.body === '!delete') {
        if (msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.fromMe) {
                quotedMsg.delete(true);
            } else {
                msg.reply('I can only delete my own messages');
            }
        }
    } else if (msg.body === '!typing') {
        const chat = await msg.getChat();
        // simulates typing in the chat
        chat.sendStateTyping();
    } else if (msg.body === '!clearstate') {
        const chat = await msg.getChat();
        // stops typing or recording in the chat
        chat.clearState();
    }
});

client.on('message_create', (msg) => {
    // Fired on all message creations, including your own
    if (msg.fromMe) {
        // do stuff here
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    // Fired whenever a message is deleted by anyone (including you)
    console.log(after); // message after it was deleted.
    if (before) {
        console.log(before); // message before it was deleted.
    }
});

client.on('message_revoke_me', async (msg) => {
    // Fired whenever a message is only deleted in your own view.
    console.log(msg.body); // message before it was deleted.
});

client.on('message_ack', (msg, ack) => {
    /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

    if (ack == 3) {
        // The message was read
    }
});

client.on('group_join', (notification) => {
    // User has joined or been added to the group.
    console.log('join', notification);
    notification.reply('User joined.');
});

client.on('group_leave', (notification) => {
    // User has left or been kicked from the group.
    console.log('leave', notification);
    notification.reply('User left.');
});

client.on('group_update', (notification) => {
    // Group picture, subject or description has been updated.
    console.log('update', notification);
});

client.on('change_battery', (batteryInfo) => {
    // Battery percentage for attached device has changed
    const { battery, plugged } = batteryInfo;
    console.log(`Battery: ${battery}% - Charging? ${plugged}`);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});
