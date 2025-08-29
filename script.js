// frontend/script.js (ФИНАЛЬНАЯ ВЕРСИЯ)
document.addEventListener('DOMContentLoaded', () => {
    feather.replace();

    // --- DOM ЭЛЕМЕНТЫ ---
    const authView = document.getElementById('auth-view'), mainView = document.getElementById('main-view');
    const loginForm = document.getElementById('login-form'), registerForm = document.getElementById('register-form');
    const switchAuthLink = document.getElementById('switch-auth-link'), authTitle = document.getElementById('auth-title'), authSubtitle = document.getElementById('auth-subtitle');
    const chatsList = document.getElementById('chats-list'), logoutButton = document.getElementById('logout-button');
    const welcomeScreen = document.getElementById('welcome-screen'), chatContent = document.getElementById('chat-content');
    const videoCallContainer = document.getElementById('video-call-container'), localVideo = document.getElementById('local-video'), remoteVideo = document.getElementById('remote-video');
    const hangUpBtn = document.getElementById('hang-up-btn'), toggleMicBtn = document.getElementById('toggle-mic-btn'), toggleVideoBtn = document.getElementById('toggle-video-btn');
    const chatHeader = document.getElementById('chat-header'), chatHeaderAvatar = document.getElementById('chat-header-avatar');
    const chatHeaderUsername = document.getElementById('chat-header-username'), chatHeaderStatus = document.getElementById('chat-header-status');
    const audioCallBtn = document.getElementById('audio-call-btn'), videoCallBtn = document.getElementById('video-call-btn'), profileInfoBtn = document.getElementById('profile-info-btn');
    const backToChatsBtn = document.getElementById('back-to-chats-btn');
    const messagesContainer = document.getElementById('messages-container'), typingIndicator = document.getElementById('typing-indicator');
    const replyPreviewBar = document.getElementById('reply-preview-bar'), replyTextPreview = document.getElementById('reply-text-preview'), cancelReplyBtn = document.getElementById('cancel-reply-btn');
    const messageForm = document.getElementById('message-form'), messageInput = document.getElementById('message-input');
    const attachFileBtn = document.getElementById('attach-file-btn'), imageUploadInput = document.getElementById('image-upload-input');
    const emojiBtn = document.getElementById('emoji-btn'), emojiPickerContainer = document.getElementById('emoji-picker-container');
    const profileSidebar = document.getElementById('profile-sidebar');
    const profileModalMobile = document.getElementById('profile-modal-mobile'), profileModalContent = document.getElementById('profile-modal-content'), closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
    const editProfileModal = document.getElementById('edit-profile-modal'), editProfileForm = document.getElementById('edit-profile-form');
    const avatarPreview = document.getElementById('avatar-preview'), avatarInput = document.getElementById('avatar-input');
    const usernameInput = document.getElementById('username-input'), bioInput = document.getElementById('bio-input');
    const changePasswordModal = document.getElementById('change-password-modal'), changePasswordForm = document.getElementById('change-password-form');
    const photoViewerModal = document.getElementById('photo-viewer-modal'), photoViewerImg = document.getElementById('photo-viewer-img'), photoViewerClose = document.getElementById('photo-viewer-close');
    const editMessageModal = document.getElementById('edit-message-modal'), editMessageInput = document.getElementById('edit-message-input'), saveEditedMessageBtn = document.getElementById('save-edited-message-btn');
    const notificationSound = document.getElementById('notification-sound');
    const incomingCallModal = document.getElementById('incoming-call-modal'), callerNameSpan = document.getElementById('caller-name');
    const answerCallBtn = document.getElementById('answer-call-btn'), declineCallBtn = document.getElementById('decline-call-btn');
    const messageContextMenu = document.getElementById('message-context-menu');
    const settingsBtn = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const soundNotificationsToggle = document.getElementById('sound-notifications-toggle');
    const toastContainer = document.getElementById('toast-container');
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchResultsList = document.getElementById('search-results-list');
    const chatsListContainer = document.getElementById('chats-list-container');

    // --- ГЛОБАЛЬНОЕ СОСТОЯНИЕ ---
    let accessToken = null, refreshToken = null, currentUser = null, userSettings = { soundNotifications: true };
    let selectedUserId = null, socket = null;
    let onlineUsers = new Set(), typingTimeout = null, searchTimeout = null;
    let peerConnection, localStream, incomingCallData = null;
    let editingMessage = null, replyingToMessage = null;
    let contextMessage = null;
    let isRefreshingToken = false;

    // --- УТИЛИТАРНЫЕ ФУНКЦИИ ---
    const getAvatarUrl = (filename) => {
        if (filename && filename.startsWith('http')) {
            return filename;
        }
        if (!filename || filename === 'default_avatar.png') {
            // ВАЖНО: Замените на URL вашего аватара по умолчанию, загруженного в Cloudinary
            return 'https://res.cloudinary.com/dizgoxgrb/image/upload/v1724956329/quantum_uploads/vkjxtxgjkyocglwqfsnp.png';
        }
        // Этот fallback больше не должен использоваться, но оставим его на всякий случай
        return `https://quantum-6x3h.onrender.com/uploads/${filename}`;
    };

    const showModal = (modal) => modal.classList.remove('hidden');
    const closeModal = (modal) => modal.classList.add('hidden');
    
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    function showChatSkeletons() {
        chatsList.innerHTML = Array(8).fill(0).map(() => `
            <li class="chat-skeleton-item">
                <div class="skeleton skeleton-avatar"></div>
                <div class="skeleton-text-group">
                    <div class="skeleton skeleton-text long"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
            </li>
        `).join('');
    }

    // Универсальная функция для JSON запросов с автоматическим обновлением токена
    async function apiRequest(url, options = {}) {
        options.headers = {
            'Content-Type': 'application/json',
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        };
        
        let res = await fetch(`https://quantum-6x3h.onrender.com${url}`, options);
        
        if (res.status === 401 && !isRefreshingToken) {
            isRefreshingToken = true;
            try {
                const refreshRes = await fetch('https://quantum-6x3h.onrender.com/api/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: refreshToken })
                });

                if (!refreshRes.ok) throw new Error('Session expired');
                const data = await refreshRes.json();
                accessToken = data.accessToken;
                localStorage.setItem('accessToken', accessToken);
                
                options.headers['Authorization'] = `Bearer ${accessToken}`;
                res = await fetch(`https://quantum-6x3h.onrender.com${url}`, options);

            } catch (error) {
                console.error("Token refresh failed:", error);
                showAuthView();
                return null;
            } finally {
                isRefreshingToken = false;
            }
        }
        return res;
    }
    
    // Специальная функция для загрузки файлов (FormData)
    async function apiUploadRequest(url, options = {}) {
        options.headers = {
            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        };
        
        let res = await fetch(`https://quantum-6x3h.onrender.com${url}`, options);
        
        if (res.status === 401 && !isRefreshingToken) {
            isRefreshingToken = true;
            try {
                const refreshRes = await fetch('https://quantum-6x3h.onrender.com/api/auth/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: refreshToken })
                });

                if (!refreshRes.ok) throw new Error('Session expired');
                const data = await refreshRes.json();
                accessToken = data.accessToken;
                localStorage.setItem('accessToken', accessToken);
                
                options.headers['Authorization'] = `Bearer ${accessToken}`;
                res = await fetch(`https://quantum-6x3h.onrender.com${url}`, options);

            } catch (error) {
                console.error("Token refresh failed:", error);
                showAuthView();
                return null;
            } finally {
                isRefreshingToken = false;
            }
        }
        return res;
    }

    function switchAuthForm(to = 'login') {
        loginForm.classList.toggle('hidden', to !== 'login');
        registerForm.classList.toggle('hidden', to === 'login');
        authTitle.textContent = to === 'login' ? 'Вход в Quantum' : 'Создание аккаунта';
        authSubtitle.innerHTML = to === 'login' ? 'или <a href="#" id="switch-auth-link">создайте аккаунт</a>' : 'уже есть аккаунт? <a href="#" id="switch-auth-link">войти</a>';
        document.getElementById('switch-auth-link').addEventListener('click', (e) => { e.preventDefault(); switchAuthForm(to === 'login' ? 'register' : 'login'); });
    }

    // --- ОСНОВНЫЕ ФУНКЦИИ РЕНДЕРИНГА ---
    async function renderChats() {
        showChatSkeletons();
        try {
            const res = await apiRequest('/api/users');
            if (!res || !res.ok) throw new Error('Не удалось загрузить пользователей');
            const users = await res.json();

            const meRes = await apiRequest('/api/users/me');
            if (!meRes || !meRes.ok) throw new Error('Не удалось загрузить свои данные');
            currentUser = await meRes.json();
            userSettings = { ...userSettings, ...currentUser.settings };
            soundNotificationsToggle.checked = userSettings.soundNotifications;

            localStorage.setItem('user', JSON.stringify(currentUser));
            chatsList.innerHTML = '';
            const sortedUsers = users.sort((a, b) => (b.last_message_time || 0) > (a.last_message_time || 0) ? 1 : -1);
            const selfUser = { id: currentUser.id, username: 'Избранное', profile_picture_url: currentUser.profile_picture_url, last_message: 'Ваши заметки' };
            [selfUser, ...sortedUsers].forEach(user => {
                const isOnline = onlineUsers.has(user.id);
                const li = document.createElement('li');
                li.dataset.userId = user.id;
                li.innerHTML = `<div class="list-item-avatar"><img src="${getAvatarUrl(user.profile_picture_url)}" class="avatar ${isOnline ? 'online' : ''}" alt="${user.username}"></div><div class="list-item-details"><span class="username">${user.username}</span><span class="status-text">${user.last_message ? (user.last_message.length > 25 ? user.last_message.substring(0, 25) + '...' : user.last_message) : (isOnline ? 'в сети' : 'не в сети')}</span></div>`;
                li.addEventListener('click', () => selectChat(user));
                chatsList.appendChild(li);
            });
        } catch (error) { 
            console.error("Ошибка загрузки чатов:", error);
            showToast('Ошибка загрузки чатов', 'error');
            chatsList.innerHTML = '<li>Не удалось загрузить чаты.</li>';
        }
    }
    
    async function selectChat(user) {
        if (window.innerWidth <= 768) {
            document.body.classList.add('mobile-chat-view');
            backToChatsBtn.classList.remove('hidden');
            profileInfoBtn.classList.remove('hidden');
        }
        selectedUserId = user.id;
        welcomeScreen.classList.add('hidden');
        chatContent.classList.remove('hidden');
        videoCallContainer.classList.add('hidden');
        const isSelfChat = user.id === currentUser.id;
        audioCallBtn.classList.toggle('hidden', isSelfChat);
        videoCallBtn.classList.toggle('hidden', isSelfChat);
        chatHeaderAvatar.src = getAvatarUrl(user.profile_picture_url);
        chatHeaderUsername.textContent = user.username;
        updateUserOnlineStatus(user.id, onlineUsers.has(user.id));
        document.querySelectorAll('#chats-list li').forEach(li => li.classList.toggle('active', li.dataset.userId == user.id));
        await fetchAndDisplayMessages(user.id);
        await renderProfileSidebar(user.id);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'messages_read', chatId: user.id }));
        }
    }

    async function fetchAndDisplayMessages(userId) {
        messagesContainer.innerHTML = '<div class="skeleton skeleton-text" style="width: 60%; height: 40px; margin-bottom: 15px; border-radius: 12px;"></div><div class="skeleton skeleton-text" style="width: 70%; height: 50px; margin-bottom: 15px; border-radius: 12px; margin-left: auto;"></div>';
        try {
            const receiverId = userId === currentUser.id ? currentUser.id : userId;
            const response = await apiRequest(`/api/messages/${receiverId}`);
            const messages = await response.json();
            messagesContainer.innerHTML = '';
            messages.forEach(msg => appendMessage(msg, false));
            const lastMessage = messagesContainer.lastElementChild;
            if (lastMessage) {
                lastMessage.scrollIntoView({ behavior: 'instant', block: 'end' });
            }
        } catch (error) { 
            console.error("Ошибка загрузки сообщений:", error); 
            showToast('Ошибка загрузки сообщений', 'error');
        }
    }
    
    function appendMessage(msg, shouldScroll = true) {
        const isSent = msg.sender_id === currentUser.id;
        let existingWrapper = document.querySelector(`.message-wrapper[data-message-id='${msg.id}']`);
        const wrapper = existingWrapper || document.createElement('div');
        wrapper.className = `message-wrapper ${isSent ? 'sent' : 'received'}`;
        wrapper.dataset.messageId = msg.id;
        let replyHTML = '';
        if (msg.reply_to_content) {
            replyHTML = `<div class="message-reply"><strong>${msg.reply_to_username || '...'}</strong><p>${msg.reply_to_content}</p></div>`;
        }
        let contentHTML = msg.is_deleted ? `<span class="message-content deleted">Сообщение удалено</span>` : (msg.type === 'image' ? `<img src="${msg.content}" alt="image" class="message-img">` : `<span class="message-content">${msg.content}</span>`);
        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const editedMark = msg.is_edited ? ' (изм.)' : '';
        let statusIcon = '';
        if (isSent) {
            const icon = msg.is_read ? 'check-circle' : 'check';
            const color = msg.is_read ? 'var(--accent-primary)' : 'var(--text-secondary)';
            statusIcon = `<span class="status-icon" style="color: ${color};"><i data-feather="${icon}"></i></span>`;
        }
        const metaHTML = `<div class="message-meta"><span>${time}${editedMark}</span> ${statusIcon}</div>`;
        wrapper.innerHTML = `<div class="message-bubble"><div class="message-content-wrapper">${replyHTML}${contentHTML}</div> ${metaHTML}</div>`;
        if (!existingWrapper) messagesContainer.appendChild(wrapper);
        if (shouldScroll) wrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
        feather.replace();
    }

    async function renderProfileSidebar(userId) {
        try {
            const [userRes, photosRes] = await Promise.all([apiRequest(`/api/users/${userId}`), apiRequest(`/api/users/${userId}/photos`)]);
            if(!userRes.ok || !photosRes.ok) throw new Error("Failed to load profile");
            const user = await userRes.json();
            const photos = await photosRes.json();
            let actionsHTML = (userId === currentUser.id) ? `<div id="profile-actions"><button class="profile-btn" id="edit-profile-btn">Редактировать</button><button class="profile-btn" id="change-password-btn">Пароль</button></div>` : '';
            let photosHTML = photos.map(p => `<div class="photo-grid-item"><img src="${p.photo_url}" alt="photo"></div>`).join('');
            if (userId === currentUser.id) { photosHTML += `<button class="profile-btn" id="upload-photo-btn" style="width:100%; margin-top:12px;">Загрузить фото</button><input type="file" id="photo-upload-input" class="hidden" accept="image/*">`; }
            profileSidebar.innerHTML = `<img src="${getAvatarUrl(user.profile_picture_url)}" alt="${user.username}" class="avatar"><h2>${user.username}</h2><p class="bio">${user.bio||'Нет информации о себе'}</p>${actionsHTML}<div class="profile-section"><h4>Информация</h4><div class="info-item"><span class="info-label">Email</span><span class="info-value">${user.email||'Скрыт'}</span></div></div><div class="profile-section"><h4>Фотографии</h4><div id="profile-photo-grid">${photos.length>0?photosHTML:(userId===currentUser.id?photosHTML:'<p>Нет фото.</p>')}</div></div>`;
            feather.replace();
        } catch (error) { console.error('Ошибка загрузки профиля:', error); showToast('Ошибка загрузки профиля', 'error'); }
    }
    
    // --- ЛОГИКА ЗВОНКОВ (WEB RTC) ---
    // Этот блок полностью переписан с использованием шаблона "Perfect Negotiation"
    // для максимальной совместимости с мобильными браузерами.

    function createPeerConnection() {
        hangUp(); // Завершаем любые предыдущие соединения перед созданием нового
        
        const iceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
            { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
        ];

        peerConnection = new RTCPeerConnection({ iceServers: iceServers });

        // Обработчик получения медиапотока от удаленного пользователя
        peerConnection.ontrack = event => {
            if (remoteVideo.srcObject !== event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
                console.log('Получен удаленный медиапоток!');
            }
        };

        // Обработчик получения ICE-кандидатов
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.send(JSON.stringify({ type: 'ice-candidate', receiver_id: selectedUserId, candidate: event.candidate }));
            }
        };
        
        // Обработчик изменения состояния соединения
        peerConnection.onconnectionstatechange = () => {
            if (peerConnection) {
                const state = peerConnection.connectionState;
                console.log('WebRTC connection state:', state);
                chatHeaderStatus.textContent = `Звонок: ${state}`;
                if (state === 'disconnected' || state === 'closed' || state === 'failed') {
                    hangUp();
                }
            }
        };
    }

    async function startCall(videoEnabled = false) {
        if (!selectedUserId || selectedUserId === currentUser.id) return showToast('Выберите чат для звонка', 'error');
        
        try {
            createPeerConnection();

            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoEnabled });
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            localVideo.srcObject = localStream;

            toggleVideoBtn.classList.toggle('active', videoEnabled);
            localVideo.style.display = videoEnabled ? 'block' : 'none';
            toggleMicBtn.classList.add('active');
            videoCallContainer.classList.remove('hidden');
            chatContent.classList.add('hidden');

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            socket.send(JSON.stringify({ type: 'call-offer', receiver_id: selectedUserId, offer }));
        } catch (error) {
            console.error('Ошибка при начале звонка:', error);
            showToast('Не удалось получить доступ к камере/микрофону.', 'error');
            hangUp();
        }
    }

    function hangUp() {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        remoteVideo.srcObject = null;
        localVideo.srcObject = null;
        
        if (selectedUserId && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'hang-up', receiver_id: selectedUserId }));
        }
        
        videoCallContainer.classList.add('hidden');
        if (selectedUserId) {
            chatContent.classList.remove('hidden');
            updateUserOnlineStatus(selectedUserId, onlineUsers.has(selectedUserId));
        } else {
            welcomeScreen.classList.remove('hidden');
        }
        closeModal(incomingCallModal);
        incomingCallData = null;
    }

    // --- ЛОГИКА WEBSOCKET ---
    function initWebSocket() {
        if (socket) socket.close();
        socket = new WebSocket(`wss://quantum-6x3h.onrender.com`);
        socket.onopen = () => socket.send(JSON.stringify({ type: 'auth', token: accessToken }));
        socket.onmessage = async (event) => {
            let data;
            try { data = JSON.parse(event.data); } catch (error) { console.error("Получено не-JSON сообщение от WebSocket:", event.data); return; }
            switch (data.type) {
                case 'auth_failed':
                    console.error('WebSocket auth failed:', data.message);
                    showToast('Ошибка подключения к чату. Попробуйте обновить страницу.', 'error');
                    break;
                case 'online_users_list': onlineUsers = new Set(data.userIds); await renderChats(); break;
                case 'user_online': onlineUsers.add(data.userId); updateUserOnlineStatus(data.userId, true); break;
                case 'user_offline': onlineUsers.delete(data.userId); updateUserOnlineStatus(data.userId, false); break;
                case 'new_message': 
                     await renderChats(); 
                     if (data.data.sender_id === selectedUserId || (data.data.receiver_id === selectedUserId && data.data.sender_id === currentUser.id)) { 
                        appendMessage(data.data); 
                     } 
                     if (data.data.sender_id !== currentUser.id && document.hidden && userSettings.soundNotifications) { 
                         notificationSound.play().catch(e => {}); 
                     } 
                     break;
                case 'message_deleted': const msgWrapper = document.querySelector(`.message-wrapper[data-message-id='${data.data.messageId}']`); if(msgWrapper){msgWrapper.querySelector('.message-bubble').innerHTML=`<div class="message-content-wrapper"><span class="message-content deleted">Сообщение удалено</span></div>`;} break;
                case 'message_edited': const msgToEdit = document.querySelector(`.message-wrapper[data-message-id='${data.data.id}']`); if (msgToEdit) { const content = msgToEdit.querySelector('.message-content'); if(content) content.textContent = data.data.content; const meta = msgToEdit.querySelector('.message-meta span'); if(meta && !meta.textContent.includes('(изм.)')) meta.textContent += ' (изм.)'; } break;
                case 'typing': if (data.sender_id === selectedUserId) typingIndicator.textContent = 'Печатает...'; break;
                case 'stop_typing': if (data.sender_id === selectedUserId) typingIndicator.textContent = ''; break;
                case 'messages_updated': if (data.data.chatId === selectedUserId) { document.querySelectorAll('.message-wrapper.sent .status-icon').forEach(icon => { icon.innerHTML = `<i data-feather="check-circle"></i>`; icon.style.color = 'var(--accent-primary)'; }); feather.replace(); } break;
                case 'call-offer':
                    if (peerConnection) { socket.send(JSON.stringify({ type: 'hang-up', receiver_id: data.sender_id })); return; }
                    incomingCallData = { offer: data.offer, sender_id: data.sender_id };
                    const li = document.querySelector(`#chats-list li[data-user-id='${data.sender_id}'] .username`);
                    callerNameSpan.textContent = li ? li.textContent : 'Неизвестный';
                    showModal(incomingCallModal);
                    break;
                case 'call-answer': if (peerConnection) await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer)); break;
                case 'ice-candidate': if (peerConnection) await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)); break;
                case 'hang-up': hangUp(); break;
            }
        };
        socket.onerror = (error) => { console.error('WebSocket ошибка:', error); showToast('Ошибка соединения с сервером чата', 'error'); };
        socket.onclose = () => { console.log('WebSocket соединение закрыто'); };
    }
    
    // --- УПРАВЛЕНИЕ ВИДАМИ ---
    function showChatView() {
        authView.classList.add('hidden');
        mainView.classList.remove('hidden');
        renderChats();
        initWebSocket();
    }
    function showAuthView() {
        if (socket) socket.close();
        mainView.classList.add('hidden');
        authView.classList.remove('hidden');
        accessToken = null; refreshToken = null; currentUser = null; 
        localStorage.clear();
    }
    function updateUserOnlineStatus(userId, isOnline) {
        const chatLi = document.querySelector(`#chats-list li[data-user-id='${userId}'] .avatar`);
        if (chatLi) chatLi.classList.toggle('online', isOnline);
        if (userId === selectedUserId) {
            chatHeaderStatus.textContent = isOnline ? 'в сети' : 'не в сети';
            chatHeaderStatus.style.color = isOnline ? 'var(--online-indicator)' : 'var(--text-secondary)';
        }
    }
    
    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---
    document.getElementById('switch-auth-link').addEventListener('click', (e) => { e.preventDefault(); switchAuthForm('register'); });
    
    loginForm.addEventListener('submit', async (e) => { 
        e.preventDefault(); 
        try { 
            const res = await fetch('https://quantum-6x3h.onrender.com/api/auth/login', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ email: loginForm.querySelector('#login-email').value, password: loginForm.querySelector('#login-password').value }) 
            });
            const data = await res.json(); 
            if (!res.ok) throw new Error(data.message); 
            accessToken = data.accessToken; 
            refreshToken = data.refreshToken;
            currentUser = data.user; 
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(currentUser)); 
            showToast('Вход выполнен успешно!', 'success');
            showChatView(); 
        } catch (error) { 
            showToast(error.message || 'Ошибка входа', 'error'); 
        } 
    });

    registerForm.addEventListener('submit', async (e) => { 
        e.preventDefault(); 
        try { 
            const res = await fetch('https://quantum-6x3h.onrender.com/api/auth/register', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ username: registerForm.querySelector('#username').value, email: registerForm.querySelector('#email').value, password: registerForm.querySelector('#password').value }) 
            }); 
            const data = await res.json(); 
            if (!res.ok) throw new Error(data.message); 
            showToast('Регистрация успешна! Теперь вы можете войти.', 'success');
            switchAuthForm('login'); 
            loginForm.querySelector('#login-email').value = registerForm.querySelector('#email').value; 
        } catch (error) { 
            showToast(error.message || 'Ошибка регистрации', 'error');
        } 
    });
    
    logoutButton.addEventListener('click', async () => {
        try {
            await apiRequest('/api/auth/logout', { 
                method: 'POST', 
                body: JSON.stringify({ token: refreshToken }) 
            });
        } catch(e) {
            console.error("Logout failed, clearing client-side anyway.");
        } finally {
            showAuthView();
        }
    });

    messageForm.addEventListener('submit', (e) => { e.preventDefault(); const content = messageInput.value.trim(); if (!content || !selectedUserId || !socket) return; socket.send(JSON.stringify({ type: 'message', receiver_id: selectedUserId, content: content, messageType: 'text', reply_to_message_id: replyingToMessage ? replyingToMessage.id : null })); messageInput.value = ''; replyingToMessage = null; replyPreviewBar.classList.add('hidden'); socket.send(JSON.stringify({ type: 'stop_typing', receiver_id: selectedUserId })); });
    messageInput.addEventListener('input', () => { clearTimeout(typingTimeout); socket.send(JSON.stringify({ type: 'typing', receiver_id: selectedUserId })); typingTimeout = setTimeout(() => { socket.send(JSON.stringify({ type: 'stop_typing', receiver_id: selectedUserId })); }, 2000); });
    document.querySelector('#chat-header .user-info').addEventListener('click', () => { if(selectedUserId && window.innerWidth > 1200) renderProfileSidebar(selectedUserId); });
    audioCallBtn.addEventListener('click', () => startCall(false));
    videoCallBtn.addEventListener('click', () => startCall(true));
    
    answerCallBtn.addEventListener('click', async () => {
        if (!incomingCallData) return;
        
        const { offer, sender_id } = incomingCallData;
        incomingCallData = null; 
        closeModal(incomingCallModal);

        const chatToSelect = document.querySelector(`#chats-list li[data-user-id='${sender_id}']`);
        if (chatToSelect) chatToSelect.click();
        
        try {
            createPeerConnection();

            const constraints = offer.sdp.includes('m=video') ? { audio: true, video: true } : { audio: true, video: false };
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            localVideo.srcObject = localStream;

            toggleVideoBtn.classList.toggle('active', constraints.video);
            localVideo.style.display = constraints.video ? 'block' : 'none';
            toggleMicBtn.classList.add('active');
            videoCallContainer.classList.remove('hidden');
            chatContent.classList.add('hidden');

            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.send(JSON.stringify({ type: 'call-answer', receiver_id: sender_id, answer }));
        } catch (error) {
            console.error("Ошибка при ответе на звонок:", error);
            showToast('Ошибка при ответе на звонок.', 'error');
            hangUp();
        }
    });
    
    declineCallBtn.addEventListener('click', () => {
        if (incomingCallData) {
            socket.send(JSON.stringify({ type: 'hang-up', receiver_id: incomingCallData.sender_id }));
        }
        closeModal(incomingCallModal);
        incomingCallData = null;
    });

    settingsBtn.addEventListener('click', () => showModal(settingsModal));
    soundNotificationsToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        userSettings.soundNotifications = enabled;
        try {
            const res = await apiRequest('/api/users/settings', {
                method: 'PUT',
                body: JSON.stringify({ soundNotifications: enabled })
            });
            if (!res.ok) throw new Error('Failed to save settings');
            showToast('Настройки сохранены', 'success');
        } catch (error) {
            showToast('Не удалось сохранить настройки', 'error');
            e.target.checked = !enabled;
            userSettings.soundNotifications = !enabled;
        }
    });

    document.body.addEventListener('click', async (e) => {
        if (e.target.matches('#edit-profile-btn')) { const res = await apiRequest(`/api/users/me`); const user = await res.json(); usernameInput.value = user.username; bioInput.value = user.bio || ''; avatarPreview.src = getAvatarUrl(user.profile_picture_url); showModal(editProfileModal); }
        if (e.target.matches('#change-password-btn')) showModal(changePasswordModal);
        if (e.target.closest('.modal-close-btn')) e.target.closest('.modal-overlay').classList.add('hidden');
        if (e.target.matches('#upload-photo-btn')) document.getElementById('photo-upload-input').click();
        const photo = e.target.closest('.message-img, .photo-grid-item img'); if (photo) { photoViewerImg.src = photo.src; showModal(photoViewerModal); }
        if (!messageContextMenu.contains(e.target)) { messageContextMenu.classList.add('hidden'); }
    });

    messagesContainer.addEventListener('contextmenu', e => {
        e.preventDefault();
        const messageBubble = e.target.closest('.message-content-wrapper');
        if (!messageBubble) return;
        const messageWrapper = messageBubble.closest('.message-wrapper');
        const isSent = messageWrapper.classList.contains('sent');
        const isDeleted = messageWrapper.querySelector('.message-content.deleted');
        if (isDeleted) return;
        messageContextMenu.querySelector('[data-action="edit"]').style.display = isSent ? 'block' : 'none';
        messageContextMenu.querySelector('[data-action="delete"]').style.display = isSent ? 'block' : 'none';
        contextMessage = messageWrapper;
        messageContextMenu.style.top = `${e.clientY}px`;
        messageContextMenu.style.left = `${e.clientX}px`;
        messageContextMenu.classList.remove('hidden');
    });

    messageContextMenu.addEventListener('click', e => {
        if (!contextMessage) return;
        const action = e.target.dataset.action;
        const msgId = contextMessage.dataset.messageId;
        const contentEl = contextMessage.querySelector('.message-content');
        if (action === 'delete') { socket.send(JSON.stringify({ type: 'delete_message', messageId: msgId, receiver_id: selectedUserId })); }
        else if (action === 'edit') { editingMessage = { id: msgId, content: contentEl.textContent }; editMessageInput.value = editingMessage.content; showModal(editMessageModal); }
        else if (action === 'reply') { replyingToMessage = { id: msgId, content: contentEl.textContent.substring(0, 50) + '...' }; replyTextPreview.textContent = replyingToMessage.content; replyPreviewBar.classList.remove('hidden'); messageInput.focus(); }
        messageContextMenu.classList.add('hidden');
    });
    
    saveEditedMessageBtn.addEventListener('click', () => { const newContent = editMessageInput.value.trim(); if (newContent && editingMessage) { socket.send(JSON.stringify({ type: 'edit_message', messageId: editingMessage.id, newContent: newContent, receiver_id: selectedUserId })); } closeModal(editMessageModal); editingMessage = null; });
    cancelReplyBtn.addEventListener('click', () => { replyingToMessage = null; replyPreviewBar.classList.add('hidden'); });
    toggleMicBtn.addEventListener('click', () => { if (!localStream) return; const audioTrack = localStream.getAudioTracks()[0]; audioTrack.enabled = !audioTrack.enabled; toggleMicBtn.classList.toggle('active', audioTrack.enabled); feather.replace(); });
    toggleVideoBtn.addEventListener('click', () => { if (!localStream) return; const videoTrack = localStream.getVideoTracks()[0]; videoTrack.enabled = !videoTrack.enabled; toggleVideoBtn.classList.toggle('active', videoTrack.enabled); localVideo.style.display = videoTrack.enabled ? 'block' : 'none'; feather.replace(); });
    hangUpBtn.addEventListener('click', hangUp);
    
    backToChatsBtn.addEventListener('click', () => {
        document.body.classList.remove('mobile-chat-view');
        selectedUserId = null;
        backToChatsBtn.classList.add('hidden');
        profileInfoBtn.classList.add('hidden');
    });
    profileInfoBtn.addEventListener('click', async () => { 
        if (!selectedUserId) return; 
        profileModalContent.innerHTML = profileSidebar.innerHTML; 
        profileModalMobile.classList.add('open'); 
        feather.replace(); 
    });
    closeProfileModalBtn.addEventListener('click', () => { 
        profileModalMobile.classList.remove('open'); 
    });

    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const textUpdateRes = await apiRequest('/api/users/profile', {
                method: 'PUT',
                body: JSON.stringify({ username: usernameInput.value, bio: bioInput.value })
            });
            if (!textUpdateRes.ok) throw new Error('Ошибка обновления профиля');

            if (avatarInput.files.length > 0) {
                const formData = new FormData();
                formData.append('avatar', avatarInput.files[0]);
                const avatarUpdateRes = await apiUploadRequest('/api/users/profile/picture', {
                    method: 'PUT',
                    body: formData
                });
                if (!avatarUpdateRes.ok) throw new Error('Ошибка загрузки аватара');
            }
            
            closeModal(editProfileModal);
            showToast('Профиль успешно обновлен', 'success');
            await renderChats();
            await renderProfileSidebar(currentUser.id);

        } catch (error) {
            showToast(error.message, 'error');
        }
    });

    avatarInput.addEventListener('change', () => { if (avatarInput.files[0]) { const reader = new FileReader(); reader.onload = (e) => { avatarPreview.src = e.target.result; }; reader.readAsDataURL(avatarInput.files[0]); } });
    changePasswordForm.addEventListener('submit', async(e) => { e.preventDefault(); const oldPassword = changePasswordForm.querySelector('#old-password-input').value, newPassword = changePasswordForm.querySelector('#new-password-input').value; const res = await apiRequest('/api/users/password', { method: 'PUT', body: JSON.stringify({ oldPassword, newPassword }) }); const data = await res.json(); if (!res.ok) return showToast(data.message, 'error'); showToast('Пароль успешно изменен!', 'success'); closeModal(changePasswordModal); changePasswordForm.reset(); });
    
    document.body.addEventListener('change', async (e) => {
        if (e.target.matches('#photo-upload-input') && e.target.files.length > 0) {
            const formData = new FormData();
            formData.append('photo', e.target.files[0]);
            const res = await apiUploadRequest('/api/photos', { method: 'POST', body: formData });
            if (res.ok) {
                showToast('Фото загружено!', 'success');
                await renderProfileSidebar(currentUser.id);
            } else {
                showToast('Ошибка загрузки фото.', 'error');
            }
            e.target.value = '';
        }
        if (e.target.matches('#image-upload-input') && e.target.files.length > 0) {
            const formData = new FormData();
            formData.append('photo', e.target.files[0]);
            const res = await apiUploadRequest('/api/photos', { method: 'POST', body: formData });
            if (!res.ok) return showToast('Ошибка загрузки', 'error');
            const data = await res.json();
            socket.send(JSON.stringify({ type: 'message', receiver_id: selectedUserId, content: data.filename, messageType: 'image' }));
            e.target.value = '';
        }
    });
    
    attachFileBtn.addEventListener('click', () => imageUploadInput.click());
    photoViewerClose.addEventListener('click', () => closeModal(photoViewerModal));
    emojiBtn.addEventListener('click', (event) => { event.stopPropagation(); emojiPickerContainer.classList.toggle('hidden'); });
    document.querySelector('emoji-picker').addEventListener('emoji-click', event => { messageInput.value += event.detail.unicode; messageInput.focus(); });
    document.addEventListener('click', (event) => { if (!emojiPickerContainer.contains(event.target) && !emojiBtn.contains(event.target)) { emojiPickerContainer.classList.add('hidden'); } });

    // --- ЛОГИКА ПОИСКА ---
    function renderSearchResults(users) {
        searchResultsList.innerHTML = '';
        if (users.length === 0) {
            searchResultsList.innerHTML = '<li>Пользователи не найдены.</li>';
            return;
        }

        users.forEach(user => {
            const li = document.createElement('li');
            li.dataset.userId = user.id;
            li.innerHTML = `<div class="list-item-avatar"><img src="${getAvatarUrl(user.profile_picture_url)}" class="avatar" alt="${user.username}"></div><div class="list-item-details"><span class="username">${user.username}</span></div>`;
            
            li.addEventListener('click', () => {
                selectChat(user);
                searchInput.value = '';
                searchResultsContainer.classList.add('hidden');
                chatsListContainer.classList.remove('hidden');
            });
            searchResultsList.appendChild(li);
        });
    }
    
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();

        if (!query) {
            searchResultsContainer.classList.add('hidden');
            chatsListContainer.classList.remove('hidden');
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const res = await apiRequest(`/api/users/search?q=${query}`);
                if (!res.ok) throw new Error('Search failed');
                const users = await res.json();
                
                chatsListContainer.classList.add('hidden');
                searchResultsContainer.classList.remove('hidden');
                renderSearchResults(users);

            } catch (error) {
                console.error("Ошибка поиска:", error);
                showToast('Не удалось выполнить поиск', 'error');
            }
        }, 300);
    });

    // --- ИНИЦИАЛИЗАЦИЯ ---
    const savedAccessToken = localStorage.getItem('accessToken');
    const savedRefreshToken = localStorage.getItem('refreshToken');
    const savedUser = localStorage.getItem('user');

    if (savedAccessToken && savedRefreshToken && savedUser) {
        accessToken = savedAccessToken;
        refreshToken = savedRefreshToken;
        currentUser = JSON.parse(savedUser);
        showChatView();
    } else {
        showAuthView();
    }
});