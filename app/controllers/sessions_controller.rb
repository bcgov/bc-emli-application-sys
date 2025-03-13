class SessionsController < ApplicationController
  protect_from_forgery with: :exception

  def store_entry_point
    session[:entry_point] = params[:entry_point]
    Rails.logger.info(
      "[EntryPoint Stored] session_id=#{session.id} entry_point=#{session[:entry_point]}"
    )

    head :ok
  end
end
