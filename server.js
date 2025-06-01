const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 用户数据库 (实际应用中应该使用真实数据库)
const users = {
    '2023001': { password: 'password1', name: '张三' },
    '2023002': { password: 'password2', name: '李四' },
    // 添加更多用户...
};

// 在线用户
const onlineUsers = new Map();

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket连接处理
wss.on('connection', (ws) => {
    console.log('新用户连接');
    
    // 发送欢迎消息
    ws.send(JSON.stringify({
        type: 'system',
        message: '欢迎来到班级聊天室!'
    }));
    
    // 处理消息
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'login') {
                // 登录处理
                const user = users[data.studentId];
                if (user && user.password === data.password) {
                    onlineUsers.set(ws, {
                        id: data.studentId,
                        name: user.name
                    });
                    
                    // 发送登录成功消息
                    ws.send(JSON.stringify({
                        type: 'login_success',
                        user: { id: data.studentId, name: user.name }
                    }));
                    
                    // 广播在线用户更新
                    broadcastOnlineUsers();
                } else {
                    ws.send(JSON.stringify({
                        type: 'login_fail',
                        message: '学号或密码错误'
                    }));
                }
            } else if (data.type === 'message') {
                // 广播消息
                const user = onlineUsers.get(ws);
                if (user) {
                    broadcastMessage({
                        type: 'new_message',
                        userId: user.id,
                        userName: user.name,
                        text: data.text,
                        timestamp: new Date().getTime()
                    });
                }
            }
        } catch (error) {
            console.error('消息处理错误:', error);
        }
    });
    
    // 连接关闭
    ws.on('close', () => {
        onlineUsers.delete(ws);
        broadcastOnlineUsers();
        console.log('用户断开连接');
    });
});

// 广播在线用户列表
function broadcastOnlineUsers() {
    const usersList = Array.from(onlineUsers.values());
    const message = JSON.stringify({
        type: 'online_users',
        users: usersList,
        count: usersList.length
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// 广播新消息
function broadcastMessage(message) {
    const messageStr = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
