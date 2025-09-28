export const Dashboard = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">대시보드</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">내 팀</h2>
          <p className="text-gray-600">가입한 팀 목록을 확인하세요.</p>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">오늘 일정</h2>
          <p className="text-gray-600">오늘 예정된 일정을 확인하세요.</p>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">최근 메시지</h2>
          <p className="text-gray-600">팀 채팅의 최근 메시지를 확인하세요.</p>
        </div>
      </div>
    </div>
  )
}
