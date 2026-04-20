/**
 * Api Name
 */
export enum ApiName {
  ADD_ACTOR = 'addActor',
  ANALYZE_JOB = 'analyzeJob',
  ANALYZE_JOBS = 'analyzeJobs',
  CREATE_WEBDAV_CATEGORY = 'createWebDavCategory',
  DELETE_ACTOR = 'deleteActor',
  DELETE_ALL_ACTORS = 'deleteAllActors',
  DELETE_JOB = 'deleteJob',
  DELETE_JOBS = 'deleteJobs',
  EXPORT_IMAGE = 'exportImage',
  EXPORT_JOB = 'exportJob',
  TRAIN_JOB = 'trainJob',
  EXPORT_JOBS = 'exportJobs',
  GENERATE_IMAGE_PREVIEW = 'generateImagePreview',
  GET_ANALYZE_JOBS = 'getAnalyzeJobs',
  ADD_TRAIN_JOB = 'addTrainJob',
  GET_TRAIN_JOBS = 'getTrainJobs',
  GET_DELETE_JOBS = 'getDeleteJobs',
  GET_IMAGE_PROCESSING = 'getImageProcessing',
  GET_JOBS_CONFIGURATION = 'getJobsConfiguration',
  GET_NAVIGATION = 'getNavigation',
  GET_MODELS = 'getModels',
  GET_SERVICES = 'getServices',
  GET_STARRED_DASHBOARDS = 'getStarredDashboards',
  GET_UPLOAD_PROGRESS = 'getUploadProgress',
  GET_WEBDAV_FILES = 'getWebDavFiles',
  MOVE_WEBDAV_ITEM = 'moveWebDavItem',
  PING = 'ping',
  REMOVE_WEBDAV_ITEM = 'removeWebDavItem',
  RENAME_WEBDAV_FILE = 'renameWebDavFile',
  START_IMAGE_PROCESSING = 'startImageProcessing',
  START_MEDIA_PROCESSING = 'startMediaProcessing',
  STREAM = 'stream',
  UPDATE_ACTOR = 'updateActor',
  UPDATE_ACTOR_PARAMETERS = 'updateActorParameters',
  UPDATE_IMAGE_PROCESSING = 'updateImageProcessing',
  UPDATE_TOGGLE_ANALYZE = 'updateToggleAnalyze',
  UPLOAD_FILE = 'uploadFile',
  UPLOAD_IMAGE = 'uploadImage',
  UPLOAD_MEDIA = 'uploadMedia',
  GET_DEVICE_INFO = 'getDeviceInfo',
}

/**
 * Api Message Type
 */
export enum ApiMessageType {
  FAILED = 'failed',
  SUBMITTED = 'submitted',
}
