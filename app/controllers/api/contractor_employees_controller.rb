class Api::ContractorEmployeesController < Api::ApplicationController
  before_action :set_employee, only: %i[show update destroy]

  def index
    employees = ContractorEmployee.all
    render json: ContractorEmployeeBlueprint.render(employees)
  end

  def show
    render json: ContractorEmployeeBlueprint.render(@employee)
  end

  def create
    employee = ContractorEmployee.new(employee_params)
    if employee.save
      render json: ContractorEmployeeBlueprint.render(employee),
             status: :created
    else
      render json: employee.errors, status: :unprocessable_entity
    end
  end

  def update
    if @employee.update(employee_params)
      render json: ContractorEmployeeBlueprint.render(@employee)
    else
      render json: @employee.errors, status: :unprocessable_entity
    end
  end

  def destroy
    @employee.destroy
    head :no_content
  end

  private

  def set_employee
    @employee = ContractorEmployee.find(params[:id])
  end

  def employee_params
    params.require(:contractor_employee).permit(:contractor_id, :employee_id)
  end
end
