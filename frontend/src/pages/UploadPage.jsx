import UploadPanel from '../features/upload/components/UploadPanel';

function UploadPage() {
  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-adobe-dark to-adobe-darker">
      <div className="w-full max-w-2xl px-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-adobe-text mb-2">
            AI Image Editor
          </h1>
          <p className="text-adobe-textMuted">
            Transform your images with natural language commands
          </p>
        </div>
        <UploadPanel />
      </div>
    </div>
  );
}

export default UploadPage;
