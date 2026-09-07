# AC-14: a bad bearer token on an anonymous-allowed endpoint is treated as
# no token, never as 401.
RSpec.shared_examples "anonymous-allowed" do |path|
  it "treats a garbage bearer token as anonymous (#{path})" do
    get path, headers: { "Authorization" => "Bearer garbage" }
    expect(response).to have_http_status(:ok)
  end
end
