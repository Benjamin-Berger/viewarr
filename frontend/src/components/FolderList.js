import React from 'react';

const FolderList = ({ 
  folders, 
  selectedFolder, 
  onFolderSelect 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Folders</h2>
      </div>
      
      <div className="divide-y divide-gray-200">
        {folders.map((folder) => (
          <div
            key={folder.path}
            className={`p-4 cursor-pointer transition-colors duration-200 ${
              selectedFolder === folder.path
                ? 'bg-primary-50 border-r-2 border-primary-500'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => onFolderSelect(folder)}
          >
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 text-gray-500 text-lg">📁</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {folder.name}
                </p>
                <p className="text-xs text-gray-500">
                  {folder.file_count} {folder.file_count === 1 ? 'file' : 'files'}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {folders.length === 0 && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 text-gray-300 mx-auto mb-3 text-4xl">📁</div>
            <p className="text-gray-500">No folders found</p>
            <p className="text-sm text-gray-400 mt-1">
              Add some folders to the photos directory to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderList; 