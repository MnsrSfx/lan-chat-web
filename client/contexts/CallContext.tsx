import React, { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { Alert, Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from './AuthContext';
import { getApiUrl } from '@/lib/query-client';
import type { User } from '@shared/schema';

export type CallType = 'voice' | 'video';
export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended';

interface CallState {
  status: CallStatus;
  callType: CallType | null;
  remoteUser: User | null;
  callId: string | null;
  startTime: Date | null;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isVideoEnabled: boolean;
}

interface CallContextType {
  callState: CallState;
  initiateCall: (user: User, type: CallType) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleVideo: () => void;
}

const initialCallState: CallState = {
  status: 'idle',
  callType: null,
  remoteUser: null,
  callId: null,
  startTime: null,
  isMuted: false,
  isSpeakerOn: false,
  isVideoEnabled: true,
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated, user: currentUser } = useAuth();
  const [callState, setCallState] = useState<CallState>(initialCallState);
  const callStateRef = useRef<CallState>(callState);
  const wsRef = useRef<WebSocket | null>(null);
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const getWebSocketUrl = useCallback(() => {
    const apiUrl = getApiUrl();
    const url = new URL(apiUrl);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${url.host}/ws/calls?token=${token}`;
  }, [token]);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  }, []);

  const stopVibration = useCallback(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    Vibration.cancel();
  }, []);

  const startIncomingVibration = useCallback(() => {
    if (Platform.OS !== 'web') {
      vibrationIntervalRef.current = setInterval(() => {
        Vibration.vibrate([500, 500, 500, 500]);
      }, 2000);
    }
  }, []);

  const resetCallState = useCallback(() => {
    clearCallTimeout();
    stopVibration();
    setCallState(initialCallState);
  }, [clearCallTimeout, stopVibration]);

  const initiateCall = useCallback((user: User, type: CallType) => {
    if (callStateRef.current.status !== 'idle') {
      Alert.alert('Call in Progress', 'You are already in a call.');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setCallState({
      status: 'outgoing',
      callType: type,
      remoteUser: user,
      callId,
      startTime: null,
      isMuted: false,
      isSpeakerOn: type === 'video',
      isVideoEnabled: type === 'video',
    });

    sendMessage({
      type: 'call_initiate',
      callId,
      callType: type,
      targetUserId: user.id,
      callerName: currentUser?.name,
      callerPhoto: currentUser?.photos?.[currentUser?.avatarIndex || 0],
    });

    callTimeoutRef.current = setTimeout(() => {
      // Use ref to get current state in timeout callback
      if (callStateRef.current.status === 'outgoing') {
        Alert.alert('No Answer', `${user.name} did not answer the call.`);
        // Inline the end call logic to avoid stale closure
        if (callStateRef.current.callId) {
          sendMessage({
            type: 'call_end',
            callId: callStateRef.current.callId,
          });
        }
        clearCallTimeout();
        stopVibration();
        setCallState(initialCallState);
      }
    }, 45000);
  }, [currentUser, sendMessage, clearCallTimeout, stopVibration]);

  const acceptCall = useCallback(() => {
    const currentState = callStateRef.current;
    if (currentState.status !== 'incoming' || !currentState.callId) {
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    stopVibration();

    sendMessage({
      type: 'call_accept',
      callId: currentState.callId,
    });

    setCallState(prev => ({
      ...prev,
      status: 'connected',
      startTime: new Date(),
    }));
  }, [sendMessage, stopVibration]);

  const rejectCall = useCallback(() => {
    const currentState = callStateRef.current;
    if (currentState.status !== 'incoming' || !currentState.callId) {
      return;
    }

    stopVibration();

    sendMessage({
      type: 'call_reject',
      callId: currentState.callId,
    });

    resetCallState();
  }, [sendMessage, stopVibration, resetCallState]);

  const endCall = useCallback(() => {
    const currentState = callStateRef.current;
    if (currentState.callId) {
      sendMessage({
        type: 'call_end',
        callId: currentState.callId,
      });
    }

    resetCallState();
  }, [sendMessage, resetCallState]);

  const toggleMute = useCallback(() => {
    setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleSpeaker = useCallback(() => {
    setCallState(prev => ({ ...prev, isSpeakerOn: !prev.isSpeakerOn }));
  }, []);

  const toggleVideo = useCallback(() => {
    setCallState(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
  }, []);

  useEffect(() => {
    if (!token || !isAuthenticated) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Call WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Use ref to access current state in callback
        const currentState = callStateRef.current;

        switch (data.type) {
          case 'incoming_call':
            if (currentState.status === 'idle') {
              startIncomingVibration();
              setCallState({
                status: 'incoming',
                callType: data.callType,
                remoteUser: {
                  id: data.callerId,
                  name: data.callerName,
                  photos: data.callerPhoto ? [data.callerPhoto] : [],
                } as User,
                callId: data.callId,
                startTime: null,
                isMuted: false,
                isSpeakerOn: data.callType === 'video',
                isVideoEnabled: data.callType === 'video',
              });
            } else {
              sendMessage({
                type: 'call_busy',
                callId: data.callId,
              });
            }
            break;

          case 'call_accepted':
            clearCallTimeout();
            setCallState(prev => ({
              ...prev,
              status: 'connected',
              startTime: new Date(),
            }));
            break;

          case 'call_rejected':
            clearCallTimeout();
            Alert.alert('Call Declined', `${currentState.remoteUser?.name || 'User'} declined the call.`);
            resetCallState();
            break;

          case 'call_ended':
            resetCallState();
            break;

          case 'call_busy':
            clearCallTimeout();
            Alert.alert('User Busy', `${currentState.remoteUser?.name || 'User'} is on another call.`);
            resetCallState();
            break;

          case 'user_offline':
            clearCallTimeout();
            Alert.alert('User Unavailable', `${currentState.remoteUser?.name || 'User'} is not available right now.`);
            resetCallState();
            break;
        }
      } catch (error) {
        console.error('Failed to parse call message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Call WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('Call WebSocket error:', error);
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      clearCallTimeout();
      stopVibration();
    };
  }, [token, isAuthenticated, getWebSocketUrl]);

  return (
    <CallContext.Provider value={{
      callState,
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleSpeaker,
      toggleVideo,
    }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}
