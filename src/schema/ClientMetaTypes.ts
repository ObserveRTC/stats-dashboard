export const ClientMetaTypes = {
	MEDIA_CONSTRAINT: 'MEDIA_CONSTRAINT',
	MEDIA_DEVICE: 'MEDIA_DEVICE',
	MEDIA_DEVICES_SUPPORTED_CONSTRAINTS: 'MEDIA_DEVICES_SUPPORTED_CONSTRAINTS',
	USER_AGENT_DATA: 'USER_AGENT_DATA',
	USER_MEDIA_ERROR: 'USER_MEDIA_ERROR',
	LOCAL_SDP: 'LOCAL_SDP',
	OPERATION_SYSTEM: 'OPERATION_SYSTEM',
	ENGINE: 'ENGINE',
	PLATFORM: 'PLATFORM',
	BROWSER: 'BROWSER',
} as const;

export type ClientMetaType = (typeof ClientMetaTypes)[keyof typeof ClientMetaTypes];

export type MediaDeviceInfo = {
	deviceId: string;
	label: string;
	kind: string;
	groupId: string;
}

export type Browser = {
	name: string;
	version: string;
}

export type Platform = {
	name: string;
	version: string;
}

export type Engine = {
	name: string;
	version: string;
}

export type OperationSystem = {
	name: string;
	version: string;
}