class HomeController < ApplicationController
  def index
    respond_to do |format|
      format.html # Serve the HTML template
      format.any { head :not_acceptable } # Reject other formats
    end
  end
end
