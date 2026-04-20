export const image = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
export const pdf = new File(['(⌐□_□)'], 'chucknorris.pdf', { type: 'application/pdf' });
export const json = new File([JSON.stringify({ title: 'abc' })], 'chucknorris.json', { type: 'application/json' });

export const dir1Tree = {
  name: 'dir1',
  path: '/media/dir1',
  relativePath: 'dir1',
  type: 'directory',
  children: [
    {
      type: 'file',
      name: 'file1.png',
      path: '/media/dir1/file1.png',
      relativePath: 'dir1/file1.png',
      size: 222,
    },
    {
      type: 'file',
      name: 'file2.png',
      path: '/media/dir1/file2.png',
      relativePath: 'dir1/file2.png',
      size: 222,
    },
  ],
};

export const rootTree = {
  path: '/media',
  type: 'directory',
  relativePath: '',
  children: [
    {
      ...dir1Tree,
      children: undefined,
    },
    {
      name: 'file0.png',
      type: 'file',
      path: '/media/file0.png',
      relativePath: 'file0.png',
      size: 111,
    },
  ],
};

export const weightsTree = {
  path: '/weights',
  type: 'directory',
  relativePath: '',
  children: [
    {
      name: 'yolov5.pt',
      type: 'file',
      path: '/weights/yolov5.pt',
      relativePath: 'yolov5.pt',
      size: 111,
    },
  ],
};
