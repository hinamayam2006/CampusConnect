export default function ProfilePage({ params }) {
  return (
    <div className="container mt-5">
      <h1>User Profile</h1>
      <p>Viewing profile for ID: {params.id}</p>
    </div>
  );
}