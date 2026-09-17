import { useSearchParams } from 'react-router-dom';

import PlaylistSetupPage from './PlaylistSetupPage.jsx';

const AuthFailedPage = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') ?? '';

  return (
    <PlaylistSetupPage
      initialState="accountFailed"
      failureReason={reason}
      showPreview={false}
    />
  );
};

export default AuthFailedPage;
